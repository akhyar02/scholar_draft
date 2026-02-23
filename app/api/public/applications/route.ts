import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";

import { isValidCampusFacultyCoursePath } from "@/lib/application-options";
import { getRequiredAttachmentSlots } from "@/lib/application-v2";
import { isValidCountryCode } from "@/lib/countries";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { queueAndSendSubmissionEmail } from "@/lib/notifications";
import { hashPassword } from "@/lib/auth/password";
import { getS3Client } from "@/lib/s3";
import { publicApplicationSubmitSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = publicApplicationSubmitSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const data = parsed.data;
  const db = getDb();

  const scholarship = await db
    .selectFrom("scholarships")
    .select(["id", "title", "is_published", "deadline_at"])
    .where("id", "=", data.scholarshipId)
    .executeTakeFirst();

  if (!scholarship || !scholarship.is_published) {
    return jsonError(404, "NOT_FOUND", "Scholarship not found");
  }

  if (new Date(scholarship.deadline_at) <= new Date()) {
    return jsonError(409, "DEADLINE_PASSED", "Scholarship deadline has passed");
  }

  const { personalInfo, financialDeclaration } = data.form;

  if (personalInfo.nationality === "non_malaysian" && personalInfo.countryCode) {
    if (!isValidCountryCode(personalInfo.countryCode)) {
      return jsonError(400, "INVALID_COUNTRY", "Country code is invalid");
    }
  }

  const validPath = await isValidCampusFacultyCoursePath(
    personalInfo.campusOptionId,
    personalInfo.facultyOptionId,
    personalInfo.courseOptionId,
    db,
  );
  if (!validPath) {
    return jsonError(400, "INVALID_PATH", "Invalid campus/faculty/course combination");
  }

  const courseOption = await db
    .selectFrom("application_option_items")
    .select(["id", "label"])
    .where("id", "=", personalInfo.courseOptionId)
    .where("kind", "=", "course")
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!courseOption) {
    return jsonError(400, "INVALID_COURSE", "Selected course is not available");
  }

  const supportProviderIds = [...new Set(financialDeclaration.supportProviderOptionIds)];

  if (financialDeclaration.receivingOtherSupport) {
    const providers = await db
      .selectFrom("application_option_items")
      .select("id")
      .where("kind", "=", "support_provider")
      .where("is_active", "=", true)
      .where("id", "in", supportProviderIds)
      .execute();

    if (providers.length !== supportProviderIds.length) {
      return jsonError(400, "INVALID_SUPPORT_PROVIDER", "One or more support providers are invalid");
    }
  }

  const attachmentMap = new Map(data.attachments.map((item) => [item.slotKey, item]));
  if (attachmentMap.size !== data.attachments.length) {
    return jsonError(400, "DUPLICATE_ATTACHMENT", "Duplicate attachment slots are not allowed");
  }

  const normalizedForm = {
    ...data.form,
    financialDeclaration: {
      ...data.form.financialDeclaration,
      supportProviderOptionIds: supportProviderIds,
    },
  };

  const requiredSlots = getRequiredAttachmentSlots(normalizedForm);
  for (const slot of requiredSlots) {
    if (!attachmentMap.has(slot)) {
      return jsonError(400, "MISSING_ATTACHMENT", `Missing required attachment: ${slot}`);
    }
  }

  for (const attachment of data.attachments) {
    if (!attachment.s3Key.startsWith(`public-applications/${data.scholarshipId}/`)) {
      return jsonError(400, "INVALID_S3_KEY", "Invalid document key prefix");
    }
  }

  const env = getEnv();
  for (const attachment of data.attachments) {
    try {
      await getS3Client().send(
        new HeadObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: attachment.s3Key,
        }),
      );
    } catch {
      return jsonError(400, "OBJECT_NOT_FOUND", `Uploaded file missing for slot: ${attachment.slotKey}`);
    }
  }

  const existingUser = await db
    .selectFrom("users")
    .select(["id", "role"])
    .where("email", "=", personalInfo.email)
    .executeTakeFirst();

  if (existingUser?.role === "admin") {
    return jsonError(409, "EMAIL_NOT_ALLOWED", "This email cannot be used for student applications");
  }

  const studentUserId = existingUser?.id ?? crypto.randomUUID();

  const existingApplication = await db
    .selectFrom("applications")
    .select("id")
    .where("scholarship_id", "=", data.scholarshipId)
    .where("student_user_id", "=", studentUserId)
    .executeTakeFirst();

  if (existingApplication) {
    return jsonError(409, "APPLICATION_EXISTS", "An application already exists for this scholarship");
  }

  const passwordHash = existingUser ? null : await hashPassword(`${crypto.randomUUID()}-${Date.now()}`);
  const applicationId = crypto.randomUUID();

  await db.transaction().execute(async (trx) => {
    if (!existingUser) {
      await trx
        .insertInto("users")
        .values({
          id: studentUserId,
          email: personalInfo.email,
          password_hash: passwordHash ?? "",
          role: "student",
        })
        .execute();
    }

    const currentProfile = await trx
      .selectFrom("student_profiles")
      .select("user_id")
      .where("user_id", "=", studentUserId)
      .executeTakeFirst();

    if (currentProfile) {
      await trx
        .updateTable("student_profiles")
        .set({
          full_name: personalInfo.fullName,
          phone: personalInfo.mobileNumber,
          date_of_birth: null,
          institution: "MMU",
          program: courseOption.label,
          graduation_year: null,
          gpa: null,
          updated_at: new Date(),
        })
        .where("user_id", "=", studentUserId)
        .execute();
    } else {
      await trx
        .insertInto("student_profiles")
        .values({
          user_id: studentUserId,
          full_name: personalInfo.fullName,
          phone: personalInfo.mobileNumber,
          date_of_birth: null,
          institution: "MMU",
          program: courseOption.label,
          graduation_year: null,
          gpa: null,
        })
        .execute();
    }

    await trx
      .insertInto("applications")
      .values({
        id: applicationId,
        scholarship_id: data.scholarshipId,
        student_user_id: studentUserId,
        status: "submitted",
        submitted_at: new Date(),
        locked_at: new Date(),
        reopened_at: null,
        admin_notes: null,
      })
      .execute();

    await trx
      .insertInto("application_form_data")
      .values({
        application_id: applicationId,
        payload: normalizedForm,
      })
      .execute();

    await trx
      .insertInto("application_attachments")
      .values(
        data.attachments.map((attachment) => ({
          id: crypto.randomUUID(),
          application_id: applicationId,
          slot_key: attachment.slotKey,
          s3_key: attachment.s3Key,
          original_filename: attachment.fileName,
          mime_type: attachment.mimeType,
          size_bytes: attachment.sizeBytes,
        })),
      )
      .execute();

    await trx
      .insertInto("application_status_history")
      .values({
        id: crypto.randomUUID(),
        application_id: applicationId,
        from_status: null,
        to_status: "submitted",
        changed_by_user_id: studentUserId,
        reason: "Submitted via public application form (V2)",
      })
      .execute();
  });

  await queueAndSendSubmissionEmail({
    applicationId,
    recipientEmail: personalInfo.email,
    scholarshipTitle: scholarship.title,
  });

  return jsonOk({ success: true, applicationId }, { status: 201 });
}
