import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { isTransitionAllowed } from "@/lib/application-status";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { queueAndSendStatusEmail } from "@/lib/notifications";
import { statusChangeSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = statusChangeSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const db = getDb();
  const current = await db
    .selectFrom("applications as a")
    .innerJoin("users as u", "u.id", "a.student_user_id")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .select([
      "a.id",
      "a.status",
      "u.email as student_email",
      "s.title as scholarship_title",
    ])
    .where("a.id", "=", id)
    .executeTakeFirst();

  if (!current) {
    return jsonError(404, "NOT_FOUND", "Application not found");
  }

  if (!isTransitionAllowed(current.status, parsed.data.toStatus)) {
    return jsonError(409, "INVALID_TRANSITION", `${current.status} -> ${parsed.data.toStatus} is not allowed`);
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("applications")
      .set({
        status: parsed.data.toStatus,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .execute();

    await trx
      .insertInto("application_status_history")
      .values({
        id: crypto.randomUUID(),
        application_id: id,
        from_status: current.status,
        to_status: parsed.data.toStatus,
        changed_by_user_id: auth.user.id,
        reason: parsed.data.reason ?? null,
      })
      .execute();

    if (parsed.data.adminNotes?.trim()) {
      await trx
        .insertInto("application_admin_notes")
        .values({
          id: crypto.randomUUID(),
          application_id: id,
          content: parsed.data.adminNotes.trim(),
          created_by_user_id: auth.user.id,
        })
        .execute();
    }
  });

  await queueAndSendStatusEmail({
    applicationId: id,
    recipientEmail: current.student_email,
    scholarshipTitle: current.scholarship_title,
    status: parsed.data.toStatus,
  });

  return jsonOk({ success: true });
}
