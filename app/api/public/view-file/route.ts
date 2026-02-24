import { NextRequest } from "next/server";

import { jsonError } from "@/lib/http";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";
import { getClientIp, jsonRateLimited, takeRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/public/view-file?key=...
 * Returns a 302 redirect to a presigned S3 URL for viewing the file.
 * Only allows keys under the "public-applications/" or "applications/" prefix.
 */
export async function GET(request: NextRequest) {
  const rateLimit = takeRateLimit({
    namespace: "view-file",
    key: getClientIp(request),
    limit: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return jsonRateLimited(
      "RATE_LIMITED",
      "Too many requests. Please try again shortly.",
      rateLimit.retryAfterSeconds,
    );
  }

  const s3Key = request.nextUrl.searchParams.get("key");

  if (!s3Key || typeof s3Key !== "string") {
    return jsonError(400, "MISSING_KEY", "File key is required.");
  }

  // Only allow viewing application-related files
  const allowedPrefixes = ["public-applications/", "applications/"];
  const isAllowed = allowedPrefixes.some((prefix) => s3Key.startsWith(prefix));
  if (!isAllowed) {
    return jsonError(403, "FORBIDDEN", "Access denied.");
  }

  const url = await resolveStoredObjectUrl(s3Key);

  if (!url) {
    return jsonError(404, "NOT_FOUND", "File not found.");
  }

  return Response.redirect(url, 302);
}
