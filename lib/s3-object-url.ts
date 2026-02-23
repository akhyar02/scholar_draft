import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getEnv } from "@/lib/env";
import { getS3Client } from "@/lib/s3";

const READ_URL_TTL_SECONDS = 3600;
const HTTP_URL_REGEX = /^https?:\/\//i;

type ResolveStoredObjectUrlOptions = {
  downloadFileName?: string;
  responseContentType?: string;
};

function sanitizeDownloadFilename(filename: string) {
  return filename.replace(/["\\]/g, "_");
}

export async function resolveStoredObjectUrl(
  value: string | null | undefined,
  options?: ResolveStoredObjectUrlOptions,
) {
  if (!value) {
    return null;
  }

  if (HTTP_URL_REGEX.test(value)) {
    return value;
  }

  const env = getEnv();
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: value,
    ResponseContentDisposition: options?.downloadFileName
      ? `attachment; filename="${sanitizeDownloadFilename(options.downloadFileName)}"`
      : undefined,
    ResponseContentType: options?.responseContentType,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: READ_URL_TTL_SECONDS,
  });
}
