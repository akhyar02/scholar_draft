import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getClientIp, jsonRateLimited, takeRateLimit } from "@/lib/rate-limit";
import { getS3Client } from "@/lib/s3";
import { publicUploadUrlV2Schema } from "@/lib/validation";

const PRESIGNED_UPLOAD_TTL_SECONDS = 300;

function sanitizeSlotForKey(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  const rateLimit = takeRateLimit({
    namespace: "public-upload-url",
    key: getClientIp(request),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return jsonRateLimited(
      "RATE_LIMITED",
      "Too many upload URL requests. Please try again shortly.",
      rateLimit.retryAfterSeconds,
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = publicUploadUrlV2Schema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const db = getDb();
  const scholarship = await db
    .selectFrom("scholarships")
    .select(["id", "is_published", "deadline_at"])
    .where("id", "=", parsed.data.scholarshipId)
    .executeTakeFirst();

  if (!scholarship || !scholarship.is_published) {
    return jsonError(404, "NOT_FOUND", "Scholarship not found");
  }

  if (new Date(scholarship.deadline_at) <= new Date()) {
    return jsonError(409, "DEADLINE_PASSED", "Scholarship deadline has passed");
  }

  const env = getEnv();
  const fileExt = parsed.data.fileName.includes(".")
    ? parsed.data.fileName.split(".").pop()?.toLowerCase() ?? "bin"
    : "bin";
  const objectKey = `public-applications/${parsed.data.scholarshipId}/${sanitizeSlotForKey(parsed.data.slotKey)}-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

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
