import { NextRequest } from "next/server";

import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/constants";
import { requireApiUser } from "@/lib/api-auth";
import { getOwnedApplication } from "@/lib/application-service";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { UploadedObjectValidationError, validateUploadedS3Object } from "@/lib/s3-upload-validation";
import { confirmAttachmentSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "student");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = confirmAttachmentSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const application = await getOwnedApplication(id, auth.user.id);

  if (!application) {
    return jsonError(404, "NOT_FOUND", "Application not found");
  }

  if (application.status !== "draft") {
    return jsonError(409, "APPLICATION_LOCKED", "Application is locked and cannot be edited");
  }

  if (!parsed.data.s3Key.startsWith(`applications/${id}/`)) {
    return jsonError(400, "INVALID_S3_KEY", "Invalid object key for this application");
  }

  let verifiedObject: { sizeBytes: number; mimeType: string };
  try {
    verifiedObject = await validateUploadedS3Object({
      s3Key: parsed.data.s3Key,
      maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
      expectedMimeType: parsed.data.mimeType,
      expectedSizeBytes: parsed.data.sizeBytes,
    });
  } catch (error) {
    if (error instanceof UploadedObjectValidationError) {
      return jsonError(400, error.code, error.message);
    }

    throw error;
  }

  const db = getDb();

  const existing = await db
    .selectFrom("application_attachments")
    .select("id")
    .where("application_id", "=", id)
    .where("slot_key", "=", parsed.data.slotKey)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("application_attachments")
      .set({
        s3_key: parsed.data.s3Key,
        original_filename: parsed.data.fileName,
        mime_type: verifiedObject.mimeType,
        size_bytes: verifiedObject.sizeBytes,
        uploaded_at: new Date(),
      })
      .where("id", "=", existing.id)
      .execute();

    return jsonOk({ success: true, attachmentId: existing.id });
  }

  const attachmentId = crypto.randomUUID();

  await db
    .insertInto("application_attachments")
    .values({
      id: attachmentId,
      application_id: id,
      slot_key: parsed.data.slotKey,
      s3_key: parsed.data.s3Key,
      original_filename: parsed.data.fileName,
      mime_type: verifiedObject.mimeType,
      size_bytes: verifiedObject.sizeBytes,
    })
    .execute();

  return jsonOk({ success: true, attachmentId }, { status: 201 });
}
