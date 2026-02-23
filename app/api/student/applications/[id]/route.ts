import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { isApplicationFormV2, mergeApplicationFormV2 } from "@/lib/application-v2";
import { isValidCampusFacultyCoursePath } from "@/lib/application-options";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { updateDraftV2Schema } from "@/lib/validation";
import { getOwnedApplication } from "@/lib/application-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "student");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const db = getDb();

  const application = await getOwnedApplication(id, auth.user.id);

  if (!application) {
    return jsonError(404, "NOT_FOUND", "Application not found");
  }

  const [formData, attachments, documents, history] = await Promise.all([
    db
      .selectFrom("application_form_data")
      .selectAll()
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
      .selectAll()
      .where("application_id", "=", id)
      .orderBy("changed_at", "desc")
      .execute(),
  ]);

  return jsonOk({
    application,
    formData: formData?.payload ?? {},
    attachments,
    documents,
    history,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "student");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = updateDraftV2Schema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const db = getDb();
  const application = await getOwnedApplication(id, auth.user.id);

  if (!application) {
    return jsonError(404, "NOT_FOUND", "Application not found");
  }

  if (application.status !== "draft") {
    return jsonError(409, "APPLICATION_LOCKED", "Application is locked and cannot be edited");
  }

  const current = await db
    .selectFrom("application_form_data")
    .select("payload")
    .where("application_id", "=", id)
    .executeTakeFirst();

  if (!isApplicationFormV2(current?.payload)) {
    return jsonError(409, "LEGACY_DRAFT", "Draft uses legacy form and must be recreated");
  }

  const nextPayload = mergeApplicationFormV2(current.payload, parsed.data.payload);

  const { campusOptionId, facultyOptionId, courseOptionId } = nextPayload.personalInfo;
  if (campusOptionId && facultyOptionId && courseOptionId) {
    const validPath = await isValidCampusFacultyCoursePath(campusOptionId, facultyOptionId, courseOptionId, db);
    if (!validPath) {
      return jsonError(400, "INVALID_PATH", "Invalid campus/faculty/course combination");
    }
  }

  let nextProgramLabel: string | undefined;
  if (nextPayload.personalInfo.courseOptionId) {
    const option = await db
      .selectFrom("application_option_items")
      .select(["id", "label"])
      .where("id", "=", nextPayload.personalInfo.courseOptionId)
      .where("kind", "=", "course")
      .where("is_active", "=", true)
      .executeTakeFirst();

    if (option) {
      nextProgramLabel = option.label;
    }
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("application_form_data")
      .set({
        payload: nextPayload,
        updated_at: new Date(),
      })
      .where("application_id", "=", id)
      .execute();

    await trx
      .updateTable("student_profiles")
      .set({
        full_name: nextPayload.personalInfo.fullName,
        phone: nextPayload.personalInfo.mobileNumber,
        institution: "MMU",
        ...(nextProgramLabel ? { program: nextProgramLabel } : {}),
        updated_at: new Date(),
      })
      .where("user_id", "=", auth.user.id)
      .execute();

    await trx
      .updateTable("applications")
      .set({
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .execute();
  });

  return jsonOk({ success: true });
}
