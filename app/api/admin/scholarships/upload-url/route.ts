import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getS3Client } from "@/lib/s3";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";
import { scholarshipImageUploadSchema } from "@/lib/validation";

const PRESIGNED_UPLOAD_TTL_SECONDS = 300;

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = scholarshipImageUploadSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  if (parsed.data.scholarshipId) {
    const db = getDb();
    const scholarship = await db
      .selectFrom("scholarships")
      .select("id")
      .where("id", "=", parsed.data.scholarshipId)
      .executeTakeFirst();

    if (!scholarship) {
      return jsonError(404, "NOT_FOUND", "Scholarship not found");
    }
  }

  const env = getEnv();
  const fileExt = parsed.data.fileName.includes(".")
    ? parsed.data.fileName.split(".").pop()?.toLowerCase() ?? "bin"
    : "bin";
  const scholarshipKeyPrefix = parsed.data.scholarshipId ?? "drafts";
  const objectKey = `scholarships/images/${scholarshipKeyPrefix}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const putCommand = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: objectKey,
    ContentType: parsed.data.mimeType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), putCommand, {
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
  });
  const viewUrl = await resolveStoredObjectUrl(objectKey);

  return jsonOk({
    uploadUrl,
    s3Key: objectKey,
    viewUrl,
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
    method: "PUT",
    requiredHeaders: {
      "Content-Type": parsed.data.mimeType,
    },
  });
}
