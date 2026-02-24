import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getOwnedApplication } from "@/lib/application-service";
import { getRequiredAttachmentSlots, isApplicationFormV2 } from "@/lib/application-v2";
import { isValidCampusFacultyCoursePath } from "@/lib/application-options";
import { isValidCountryCode } from "@/lib/countries";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { queueAndSendSubmissionEmail } from "@/lib/notifications";
import { UploadedObjectValidationError, validateUploadedS3Object } from "@/lib/s3-upload-validation";
import { applicationFormV2Schema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "student");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const db = getDb();

  const application = await getOwnedApplication(id, auth.user.id);

  if (!application) {
    return jsonError(404, "NOT_FOUND", "Application not found");
  }

  if (application.status !== "draft") {
    return jsonError(409, "APPLICATION_LOCKED", "Application is already submitted or under review");
  }

  if (!application.is_published) {
    return jsonError(409, "SCHOLARSHIP_UNPUBLISHED", "Scholarship is no longer published");
  }

  if (new Date(application.deadline_at) <= new Date()) {
    return jsonError(409, "DEADLINE_PASSED", "Scholarship deadline has passed");
  }

  const [formData, attachments] = await Promise.all([
    db
      .selectFrom("application_form_data")
      .select("payload")
      .where("application_id", "=", id)
      .executeTakeFirst(),
    db
      .selectFrom("application_attachments")
      .select(["slot_key", "s3_key", "mime_type", "size_bytes"])
      .where("application_id", "=", id)
      .execute(),
  ]);

  if (!isApplicationFormV2(formData?.payload)) {
    return jsonError(409, "LEGACY_DRAFT", "Draft uses legacy form and must be recreated");
  }

  const parsedForm = applicationFormV2Schema.safeParse(formData.payload);

  if (!parsedForm.success) {
    return jsonError(400, "FORM_INCOMPLETE", parsedForm.error.issues[0]?.message ?? "Application form is incomplete");
  }

  const normalizedSupportIds = [...new Set(parsedForm.data.financialDeclaration.supportProviderOptionIds)];

  if (
    parsedForm.data.personalInfo.nationality === "non_malaysian" &&
    parsedForm.data.personalInfo.countryCode &&
    !isValidCountryCode(parsedForm.data.personalInfo.countryCode)
  ) {
    return jsonError(400, "INVALID_COUNTRY", "Country code is invalid");
  }

  const validPath = await isValidCampusFacultyCoursePath(
    parsedForm.data.personalInfo.campusOptionId,
    parsedForm.data.personalInfo.facultyOptionId,
    parsedForm.data.personalInfo.courseOptionId,
    db,
  );
  if (!validPath) {
    return jsonError(400, "INVALID_PATH", "Invalid campus/faculty/course combination");
  }

  if (parsedForm.data.financialDeclaration.receivingOtherSupport) {
    const providers = await db
      .selectFrom("application_option_items")
      .select("id")
      .where("kind", "=", "support_provider")
      .where("is_active", "=", true)
      .where("id", "in", normalizedSupportIds)
      .execute();

    if (providers.length !== normalizedSupportIds.length) {
      return jsonError(400, "INVALID_SUPPORT_PROVIDER", "One or more support providers are invalid");
    }
  }

  const requiredSlots = getRequiredAttachmentSlots({
    ...parsedForm.data,
    financialDeclaration: {
      ...parsedForm.data.financialDeclaration,
      supportProviderOptionIds: normalizedSupportIds,
    },
  });

  const provided = new Set(attachments.map((item) => item.slot_key));
  for (const slot of requiredSlots) {
    if (!provided.has(slot)) {
      return jsonError(400, "MISSING_ATTACHMENT", `Missing required attachment: ${slot}`);
    }
  }

  for (const attachment of attachments) {
    try {
      await validateUploadedS3Object({
        s3Key: attachment.s3_key,
        maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
        expectedMimeType: attachment.mime_type,
        expectedSizeBytes: attachment.size_bytes,
      });
    } catch (error) {
      if (error instanceof UploadedObjectValidationError) {
        return jsonError(400, error.code, `${error.message} (slot: ${attachment.slot_key})`);
      }

      throw error;
    }
  }

  const courseOption = await db
    .selectFrom("application_option_items")
    .select(["id", "label"])
    .where("id", "=", parsedForm.data.personalInfo.courseOptionId)
    .where("kind", "=", "course")
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!courseOption) {
    return jsonError(400, "INVALID_COURSE", "Selected course is not available");
  }

  const finalPayload = {
    ...parsedForm.data,
    financialDeclaration: {
      ...parsedForm.data.financialDeclaration,
      supportProviderOptionIds: normalizedSupportIds,
    },
  };

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("application_form_data")
      .set({
        payload: finalPayload,
        updated_at: new Date(),
      })
      .where("application_id", "=", id)
      .execute();

    await trx
      .updateTable("student_profiles")
      .set({
        full_name: finalPayload.personalInfo.fullName,
        phone: finalPayload.personalInfo.mobileNumber,
        institution: "MMU",
        program: courseOption.label,
        updated_at: new Date(),
      })
      .where("user_id", "=", auth.user.id)
      .execute();

    await trx
      .updateTable("applications")
      .set({
        status: "submitted",
        submitted_at: new Date(),
        locked_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .execute();

    await trx
      .insertInto("application_status_history")
      .values({
        id: crypto.randomUUID(),
        application_id: id,
        from_status: "draft",
        to_status: "submitted",
        changed_by_user_id: auth.user.id,
        reason: "Student submitted application (V2)",
      })
      .execute();
  });

  await queueAndSendSubmissionEmail({
    applicationId: id,
    recipientEmail: finalPayload.personalInfo.email,
    scholarshipTitle: application.scholarship_title,
  });

  return jsonOk({ success: true });
}
