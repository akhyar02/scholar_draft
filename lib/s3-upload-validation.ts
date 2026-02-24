import { HeadObjectCommand, type HeadObjectCommandOutput } from "@aws-sdk/client-s3";

import { getEnv } from "@/lib/env";
import { getS3Client } from "@/lib/s3";

export class UploadedObjectValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function normalizeMimeType(value: string | undefined) {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

export async function validateUploadedS3Object(params: {
  s3Key: string;
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
  expectedMimeType?: string;
  expectedSizeBytes?: number;
}) {
  const env = getEnv();

  let head: HeadObjectCommandOutput;
  try {
    head = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: params.s3Key,
      }),
    );
  } catch {
    throw new UploadedObjectValidationError("OBJECT_NOT_FOUND", "Uploaded file was not found in S3");
  }

  const sizeBytes = head.ContentLength;
  if (!Number.isFinite(sizeBytes) || !sizeBytes || sizeBytes <= 0) {
    throw new UploadedObjectValidationError("INVALID_OBJECT_METADATA", "Uploaded file size could not be verified");
  }

  if (sizeBytes > params.maxSizeBytes) {
    throw new UploadedObjectValidationError(
      "FILE_TOO_LARGE",
      `Uploaded file exceeds the maximum allowed size of ${params.maxSizeBytes} bytes`,
    );
  }

  const mimeType = normalizeMimeType(head.ContentType);
  const allowedMimeTypes = new Set(params.allowedMimeTypes.map((value) => value.toLowerCase()));

  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    throw new UploadedObjectValidationError("INVALID_MIME_TYPE", "Uploaded file type is not allowed");
  }

  if (params.expectedMimeType && mimeType !== params.expectedMimeType.toLowerCase()) {
    throw new UploadedObjectValidationError("MIME_TYPE_MISMATCH", "Uploaded file type does not match request");
  }

  if (typeof params.expectedSizeBytes === "number" && sizeBytes !== params.expectedSizeBytes) {
    throw new UploadedObjectValidationError("SIZE_MISMATCH", "Uploaded file size does not match request");
  }

  return {
    sizeBytes,
    mimeType,
  };
}
