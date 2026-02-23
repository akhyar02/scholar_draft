import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { createDraftApplication } from "@/lib/application-service";
import { createApplicationSchema } from "@/lib/validation";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, "student");
  if ("response" in auth) {
    return auth.response;
  }

  const db = getDb();

  const applications = await db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .select([
      "a.id",
      "a.status",
      "a.submitted_at",
      "a.locked_at",
      "a.created_at",
      "a.updated_at",
      "s.title as scholarship_title",
      "s.slug as scholarship_slug",
      "s.deadline_at",
    ])
    .where("a.student_user_id", "=", auth.user.id)
    .orderBy("a.updated_at", "desc")
    .execute();

  return jsonOk({ applications });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, "student");
  if ("response" in auth) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = createApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const db = getDb();
  const scholarship = await db
    .selectFrom("scholarships")
    .select(["id", "deadline_at", "is_published"])
    .where("id", "=", parsed.data.scholarshipId)
    .executeTakeFirst();

  if (!scholarship || !scholarship.is_published) {
    return jsonError(404, "NOT_FOUND", "Scholarship not found");
  }

  if (new Date(scholarship.deadline_at) <= new Date()) {
    return jsonError(409, "DEADLINE_PASSED", "Scholarship deadline has passed");
  }

  const existing = await db
    .selectFrom("applications")
    .select("id")
    .where("scholarship_id", "=", scholarship.id)
    .where("student_user_id", "=", auth.user.id)
    .executeTakeFirst();

  if (existing) {
    return jsonError(409, "APPLICATION_EXISTS", "Application already exists for this scholarship");
  }

  try {
    const applicationId = await createDraftApplication({
      scholarshipId: scholarship.id,
      studentUserId: auth.user.id,
      studentEmail: auth.user.email,
    });

    return jsonOk({ applicationId }, { status: 201 });
  } catch (error) {
    return jsonError(404, "PROFILE_NOT_FOUND", error instanceof Error ? error.message : "Student profile not found");
  }
}
