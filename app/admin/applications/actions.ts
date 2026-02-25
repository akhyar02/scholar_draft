"use server";

import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import type { ApplicationStatus } from "@/lib/constants";

export type ApplicationRow = {
  id: string;
  status: ApplicationStatus;
  updated_at: Date;
  scholarship_title: string;
  student_name: string;
  student_email: string;
};

export type FetchApplicationsResult = {
  applications: ApplicationRow[];
  total: number;
};

const PAGE_SIZE = 25;

export async function fetchApplicationsPage({
  page,
  q,
  statuses,
}: {
  page: number;
  q: string;
  statuses: ApplicationStatus[];
}): Promise<FetchApplicationsResult> {
  await requirePageUser("admin");
  const db = getDb();

  const base = db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .innerJoin("student_profiles as p", "p.user_id", "a.student_user_id")
    .innerJoin("users as u", "u.id", "a.student_user_id")
    .$if(statuses.length > 0, (qb) => qb.where("a.status", "in", statuses))
    .$if(!!q, (qb) =>
      qb.where((eb) =>
        eb.or([eb("p.full_name", "ilike", `%${q}%`), eb("u.email", "ilike", `%${q}%`)]),
      ),
    );

  const [applications, countRow] = await Promise.all([
    base
      .select([
        "a.id",
        "a.status",
        "a.updated_at",
        "s.title as scholarship_title",
        "p.full_name as student_name",
        "u.email as student_email",
      ])
      .orderBy("a.updated_at", "desc")
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .execute(),

    base.select((eb) => eb.fn.countAll<number>().as("count")).executeTakeFirstOrThrow(),
  ]);

  return { applications, total: Number(countRow.count) };
}
