import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getOwnedApplication } from "@/lib/application-service";
import { getS3Client } from "@/lib/s3";
import { uploadUrlV2Schema } from "@/lib/validation";

const PRESIGNED_UPLOAD_TTL_SECONDS = 300;

function sanitizeSlotForKey(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
  const parsed = uploadUrlV2Schema.safeParse(payload);

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

  const env = getEnv();
  const fileExt = parsed.data.fileName.includes(".")
    ? parsed.data.fileName.split(".").pop()?.toLowerCase() ?? "bin"
    : "bin";
  const objectKey = `applications/${id}/${sanitizeSlotForKey(parsed.data.slotKey)}-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const putCommand = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: objectKey,
    ContentType: parsed.data.mimeType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), putCommand, {
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
  });

  return jsonOk({
    uploadUrl,
    s3Key: objectKey,
    slotKey: parsed.data.slotKey,
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
    method: "PUT",
    requiredHeaders: {
      "Content-Type": parsed.data.mimeType,
    },
  });
}
