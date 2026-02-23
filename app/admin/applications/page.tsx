import Link from "next/link";
import { ArrowRight, User } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  await requirePageUser("admin");
  const db = getDb();

  const applications = await db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .innerJoin("student_profiles as p", "p.user_id", "a.student_user_id")
    .innerJoin("users as u", "u.id", "a.student_user_id")
    .select([
      "a.id",
      "a.status",
      "a.updated_at",
      "s.title as scholarship_title",
      "p.full_name as student_name",
      "u.email as student_email",
    ])
    .orderBy("a.updated_at", "desc")
    .execute();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Application Review Queue</h1>
        <p className="mt-2 text-surface-600">Review and manage student scholarship applications.</p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-surface-900">No applications yet</h3>
          <p className="mt-2 text-surface-500">There are currently no applications to review.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => (
            <article 
              key={application.id} 
              className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200 transition-all hover:shadow-md hover:ring-primary-300"
            >
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-surface-900 group-hover:text-primary-700 transition-colors">
                  {application.scholarship_title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-surface-500">
                  <User className="h-4 w-4" />
                  <span>{application.student_name} ({application.student_email})</span>
                </div>
              </div>
              
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-4">
                <StatusBadge status={application.status} />
                <Link 
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700" 
                  href={`/admin/applications/${application.id}`}
                >
                  Open Review
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
