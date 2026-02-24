import { NextRequest } from "next/server";

import { isValidCampusFacultyCoursePath } from "@/lib/application-options";
import { getRequiredAttachmentSlots } from "@/lib/application-v2";
import { isValidCountryCode } from "@/lib/countries";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { queueAndSendSubmissionEmail } from "@/lib/notifications";
import { hashPassword } from "@/lib/auth/password";
import { getClientIp, jsonRateLimited, takeRateLimit } from "@/lib/rate-limit";
import { UploadedObjectValidationError, validateUploadedS3Object } from "@/lib/s3-upload-validation";
import { publicApplicationSubmitSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const rateLimit = takeRateLimit({
    namespace: "public-application-submit",
    key: getClientIp(request),
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (!rateLimit.allowed) {
    return jsonRateLimited(
      "RATE_LIMITED",
      "Too many application submissions. Please try again later.",
      rateLimit.retryAfterSeconds,
    );
  }

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

  const verifiedAttachments: Array<{
    slotKey: string;
    s3Key: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }> = [];
  for (const attachment of data.attachments) {
    try {
      const verified = await validateUploadedS3Object({
        s3Key: attachment.s3Key,
        maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
        expectedMimeType: attachment.mimeType,
        expectedSizeBytes: attachment.sizeBytes,
      });

      verifiedAttachments.push({
        ...attachment,
        mimeType: verified.mimeType,
        sizeBytes: verified.sizeBytes,
      });
    } catch (error) {
      if (error instanceof UploadedObjectValidationError) {
        return jsonError(400, error.code, `${error.message} (slot: ${attachment.slotKey})`);
      }

      throw error;
    }
  }

  const existingUser = await db
    .selectFrom("users")
    .select(["id", "role"])
    .where("email", "=", personalInfo.email)
    .executeTakeFirst();

  if (existingUser) {
    return jsonError(
      409,
      existingUser.role === "admin" ? "EMAIL_NOT_ALLOWED" : "EMAIL_ALREADY_REGISTERED",
      existingUser.role === "admin"
        ? "This email cannot be used for student applications"
        : "An account already exists for this email. Please sign in to submit an application.",
    );
  }

  const studentUserId = crypto.randomUUID();

  const passwordHash = await hashPassword(`${crypto.randomUUID()}-${Date.now()}`);
  const applicationId = crypto.randomUUID();

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("users")
      .values({
        id: studentUserId,
        email: personalInfo.email,
        password_hash: passwordHash,
        role: "student",
      })
      .execute();

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
        verifiedAttachments.map((attachment) => ({
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
