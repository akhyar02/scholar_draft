import Link from "next/link";
import { Calendar, ArrowRight, FileText } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function StudentApplicationsPage() {
  const user = await requirePageUser("student");
  const db = getDb();

  const applications = await db
    .selectFrom("applications as a")
    .innerJoin("scholarships as s", "s.id", "a.scholarship_id")
    .select([
      "a.id",
      "a.status",
      "a.submitted_at",
      "a.updated_at",
      "s.title as scholarship_title",
      "s.deadline_at",
    ])
    .where("a.student_user_id", "=", user.id)
    .orderBy("a.updated_at", "desc")
    .execute();

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-surface-900">My Applications</h1>
        <p className="mt-2 text-surface-500">Track the status of your scholarship applications.</p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-surface-200 bg-white/60 p-16 text-center backdrop-blur-sm animate-fade-in-up animate-delay-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 text-surface-400">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-surface-900">No applications yet</h3>
          <p className="mt-2 text-surface-500">You haven't applied to any scholarships yet.</p>
          <Link 
            href="/scholarships" 
            className="mt-8 btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md"
          >
            Browse Scholarships
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((application, i) => (
            <article 
              key={application.id} 
              className={`card-hover group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-${Math.min(i, 3) * 100}`}
            >
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-surface-900 group-hover:text-primary-600 transition-colors">
                  {application.scholarship_title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-surface-400">
                  <Calendar className="h-4 w-4" />
                  <span>Deadline: {new Date(application.deadline_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-4">
                <StatusBadge status={application.status} />
                <Link 
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors" 
                  href={`/student/applications/${application.id}`}
                >
                  View Details
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
