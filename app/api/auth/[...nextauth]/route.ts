import NextAuth from "next-auth";
import { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth/options";
import { getClientIp, jsonRateLimited, takeRateLimit } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

function isCredentialCallback(request: NextRequest) {
  return request.method === "POST" && request.nextUrl.pathname.endsWith("/callback/credentials");
}

export async function GET(request: NextRequest, context: unknown) {
  return handler(request, context as never);
}

export async function POST(request: NextRequest, context: unknown) {
  if (isCredentialCallback(request)) {
    const rateLimit = takeRateLimit({
      namespace: "auth-credentials-callback",
      key: getClientIp(request),
      limit: 10,
      windowMs: 10 * 60_000,
    });

    if (!rateLimit.allowed) {
      return jsonRateLimited(
        "RATE_LIMITED",
        "Too many login attempts. Please try again later.",
        rateLimit.retryAfterSeconds,
      );
    }
  }

  return handler(request, context as never);
}
