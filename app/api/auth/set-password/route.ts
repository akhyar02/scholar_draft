import { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/http";
import { validatePasswordToken, consumeTokenAndSetPassword } from "@/lib/auth/password-token";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.token !== "string" ||
    typeof body.password !== "string"
  ) {
    return jsonError(400, "INVALID_INPUT", "Token and password are required.");
  }

  const { token, password } = body as { token: string; password: string };

  if (password.length < 8) {
    return jsonError(400, "WEAK_PASSWORD", "Password must be at least 8 characters.");
  }

  const result = await validatePasswordToken(token);
  if (!result) {
    return jsonError(400, "INVALID_TOKEN", "This link is invalid or has expired. Please contact support.");
  }

  await consumeTokenAndSetPassword(result.tokenId, result.userId, password);

  return jsonOk({ message: "Password set successfully. You can now sign in." });
}
