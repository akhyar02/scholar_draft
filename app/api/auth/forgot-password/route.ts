import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { createPasswordToken } from "@/lib/auth/password-token";
import { sendPasswordResetEmail } from "@/lib/notifications";
import { getClientIp, jsonRateLimited, takeRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimit = takeRateLimit({
    namespace: "forgot-password",
    key: getClientIp(request),
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!rateLimit.allowed) {
    return jsonRateLimited(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      rateLimit.retryAfterSeconds,
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.email !== "string") {
    return jsonError(400, "INVALID_INPUT", "Email is required.");
  }

  const email = (body.email as string).trim().toLowerCase();

  // Always return success to prevent email enumeration
  const successResponse = jsonOk({
    message: "If an account exists with this email, you'll receive a password reset link shortly.",
  });

  const db = getDb();
  const user = await db
    .selectFrom("users")
    .select(["id", "email"])
    .where("email", "=", email)
    .executeTakeFirst();

  if (!user) {
    return successResponse;
  }

  try {
    const rawToken = await createPasswordToken(user.id);
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://scholarhub.yum.edu.my";
    const resetUrl = `${baseUrl}/set-password?token=${rawToken}`;

    await sendPasswordResetEmail({
      recipientEmail: user.email,
      resetUrl,
    });
  } catch {
    // Silently fail — don't leak whether the email exists
  }

  return successResponse;
}
