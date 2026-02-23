import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const db = getDb();

  const application = await db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .innerJoin("student_profiles as p", "p.user_id", "a.student_user_id")
    .innerJoin("users as u", "u.id", "a.student_user_id")
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
      "u.email as student_email",
      "p.full_name as student_name",
      "p.phone as student_phone",
      "p.institution as student_institution",
      "p.program as student_program",
      "p.graduation_year as student_graduation_year",
      "p.gpa as student_gpa",
    ])
    .where("a.id", "=", id)
    .executeTakeFirst();

  if (!application) {
    return jsonError(404, "NOT_FOUND", "Application not found");
  }

  const [formData, attachments, legacyDocuments, history] = await Promise.all([
    db
      .selectFrom("application_form_data")
      .select("payload")
      .where("application_id", "=", id)
      .executeTakeFirst(),
    db
      .selectFrom("application_attachments")
      .selectAll()
      .where("application_id", "=", id)
      .orderBy("uploaded_at", "desc")
      .execute(),
    db
      .selectFrom("application_documents")
      .selectAll()
      .where("application_id", "=", id)
      .orderBy("uploaded_at", "desc")
      .execute(),
    db
      .selectFrom("application_status_history")
      .innerJoin("users", "users.id", "application_status_history.changed_by_user_id")
      .select([
        "application_status_history.id",
        "application_status_history.application_id",
        "application_status_history.from_status",
        "application_status_history.to_status",
        "application_status_history.reason",
        "application_status_history.changed_at",
        "users.email as changed_by_email",
      ])
      .where("application_status_history.application_id", "=", id)
      .orderBy("application_status_history.changed_at", "desc")
      .execute(),
  ]);

  return jsonOk({
    application,
    formData: formData?.payload ?? {},
    attachments,
    legacyDocuments,
    history,
  });
}
