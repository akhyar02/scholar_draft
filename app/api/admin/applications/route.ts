import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { applicationStatusSchema } from "@/lib/validation";
import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const db = getDb();
  const searchParams = request.nextUrl.searchParams;
  const statusParam = searchParams.get("status");
  const scholarshipId = searchParams.get("scholarshipId");

  let query = db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .innerJoin("student_profiles as p", "p.user_id", "a.student_user_id")
    .innerJoin("users as u", "u.id", "a.student_user_id")
    .select([
      "a.id",
      "a.status",
      "a.submitted_at",
      "a.updated_at",
      "s.id as scholarship_id",
      "s.title as scholarship_title",
      "p.full_name as student_name",
      "u.email as student_email",
    ])
    .orderBy("a.updated_at", "desc");

  if (statusParam) {
    const parsed = applicationStatusSchema.safeParse(statusParam);
    if (parsed.success) {
      query = query.where("a.status", "=", parsed.data);
    }
  }

  if (scholarshipId) {
    query = query.where("a.scholarship_id", "=", scholarshipId);
  }

  const applications = await query.execute();

  return jsonOk({ applications });
}
