import crypto from "node:crypto";

import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";

/**
 * Generate a human-readable temporary password.
 * Format: Word-Word-4digits (e.g., "Bright-Star-4829")
 */
export function generateReadablePassword(): string {
  const adjectives = [
    "Bright", "Swift", "Noble", "Brave", "Calm",
    "Clear", "Fresh", "Grand", "Happy", "Kind",
    "Smart", "True", "Warm", "Bold", "Keen",
  ];
  const nouns = [
    "Star", "Wave", "Peak", "Moon", "Lake",
    "Wind", "Dawn", "Echo", "Leaf", "Flow",
    "Dove", "Sage", "Seed", "Tide", "Glow",
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const digits = String(Math.floor(1000 + Math.random() * 9000));

  return `${adj}-${noun}-${digits}`;
}

/**
 * Create a password-reset / set-password token for a user.
 * Returns the raw token (to include in the email link).
 */
export async function createPasswordToken(userId: string): Promise<string> {
  const db = getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  await db
    .insertInto("password_reset_tokens")
    .values({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used_at: null,
    })
    .execute();

  return rawToken;
}

/**
 * Validate a set-password token and return the associated user_id.
 * Returns null if the token is invalid, expired, or already used.
 */
export async function validatePasswordToken(
  rawToken: string,
): Promise<{ userId: string; tokenId: string } | null> {
  const db = getDb();
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const row = await db
    .selectFrom("password_reset_tokens")
    .select(["id", "user_id", "expires_at", "used_at"])
    .where("token_hash", "=", tokenHash)
    .executeTakeFirst();

  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  return { userId: row.user_id, tokenId: row.id };
}

/**
 * Consume the token and set the user's password.
 */
export async function consumeTokenAndSetPassword(
  tokenId: string,
  userId: string,
  newPassword: string,
): Promise<void> {
  const db = getDb();
  const hash = await hashPassword(newPassword);

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("password_reset_tokens")
      .set({ used_at: new Date() })
      .where("id", "=", tokenId)
      .execute();

    await trx
      .updateTable("users")
      .set({ password_hash: hash, updated_at: new Date() })
      .where("id", "=", userId)
      .execute();
  });
}
