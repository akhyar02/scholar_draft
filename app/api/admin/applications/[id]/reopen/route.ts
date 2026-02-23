import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { canReopen } from "@/lib/application-status";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { reopenSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const payload = await request.json().catch(() => ({}));
  const parsed = reopenSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const db = getDb();
  const current = await db
    .selectFrom("applications")
    .select(["id", "status"])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!current) {
    return jsonError(404, "NOT_FOUND", "Application not found");
  }

  if (!canReopen(current.status)) {
    return jsonError(409, "INVALID_REOPEN", `Application in status ${current.status} cannot be reopened`);
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("applications")
      .set({
        status: "draft",
        locked_at: null,
        reopened_at: new Date(),
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
        to_status: "draft",
        changed_by_user_id: auth.user.id,
        reason: parsed.data.reason ?? "Reopened by admin",
      })
      .execute();
  });

  return jsonOk({ success: true });
}
