import type { Kysely } from "kysely";

import { createDefaultApplicationFormV2 } from "@/lib/application-v2";
import { getDb } from "@/lib/db";
import type { DB } from "@/lib/db/types";
import { ApplicationStatus, DOCUMENT_TYPES } from "@/lib/constants";

type DbOrTransaction = Kysely<DB>;

export async function getOwnedApplication(applicationId: string, studentId: string) {
  const db = getDb();

  return db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .select([
      "a.id",
      "a.scholarship_id",
      "a.student_user_id",
      "a.status",
      "a.submitted_at",
      "a.locked_at",
      "a.reopened_at",
      "a.admin_notes",
      "a.created_at",
      "a.updated_at",
      "s.title as scholarship_title",
      "s.slug as scholarship_slug",
      "s.deadline_at",
      "s.is_published",
    ])
    .where("a.id", "=", applicationId)
    .where("a.student_user_id", "=", studentId)
    .executeTakeFirst();
}

export function requiresDraft(status: ApplicationStatus) {
  return status === "draft";
}

export function requiredDocumentTypes() {
  return [...DOCUMENT_TYPES];
}

export async function createDraftApplication(params: {
  db?: DbOrTransaction;
  scholarshipId: string;
  studentUserId: string;
  studentEmail: string;
}) {
  const db = params.db ?? getDb();

  const profile = await db
    .selectFrom("student_profiles")
    .selectAll()
    .where("user_id", "=", params.studentUserId)
    .executeTakeFirst();

  if (!profile) {
    throw new Error("Student profile not found");
  }

  const applicationId = crypto.randomUUID();

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("applications")
      .values({
        id: applicationId,
        scholarship_id: params.scholarshipId,
        student_user_id: params.studentUserId,
        status: "draft",
        submitted_at: null,
        locked_at: null,
        reopened_at: null,
        admin_notes: null,
      })
      .execute();

    await trx
      .insertInto("application_form_data")
      .values({
        application_id: applicationId,
        payload: createDefaultApplicationFormV2({
          fullName: profile.full_name,
          email: params.studentEmail,
          mobileNumber: profile.phone,
        }),
      })
      .execute();

    await trx
      .insertInto("application_status_history")
      .values({
        id: crypto.randomUUID(),
        application_id: applicationId,
        from_status: null,
        to_status: "draft",
        changed_by_user_id: params.studentUserId,
        reason: "Application created",
      })
      .execute();
  });

  return applicationId;
}
