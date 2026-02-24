import Link from "next/link";
import { GraduationCap, FileText, Clock, ArrowRight } from "lucide-react";

import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requirePageUser("admin");
  const db = getDb();

  const [scholarshipsCount, applicationsCount, pendingCount] = await Promise.all([
    db.selectFrom("scholarships").select((eb) => eb.fn.countAll().as("count")).executeTakeFirstOrThrow(),
    db.selectFrom("applications").select((eb) => eb.fn.countAll().as("count")).executeTakeFirstOrThrow(),
    db
      .selectFrom("applications")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("status", "in", ["submitted", "under_review", "shortlisted"])
      .executeTakeFirstOrThrow(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Admin Dashboard</h1>
          <p className="mt-2 text-surface-500">Overview of scholarships and applications.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card-hover relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-100">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-[3rem] bg-linear-to-bl from-primary-100/80 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary-50 to-primary-100 text-primary-600 shadow-sm ring-1 ring-primary-200/40">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Total Scholarships</p>
              <p className="text-3xl font-bold text-surface-900 stat-number">{Number(scholarshipsCount.count)}</p>
            </div>
          </div>
        </div>

        <div className="card-hover relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-200">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-[3rem] bg-linear-to-bl from-info-100/80 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-info-50 to-info-100 text-info-600 shadow-sm ring-1 ring-info-200/40">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Total Applications</p>
              <p className="text-3xl font-bold text-surface-900 stat-number">{Number(applicationsCount.count)}</p>
            </div>
          </div>
        </div>

        <div className="card-hover relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-300">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-[3rem] bg-linear-to-bl from-warning-100/80 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-warning-50 to-warning-100 text-warning-600 shadow-sm ring-1 ring-warning-200/40">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Review Queue</p>
              <p className="text-3xl font-bold text-surface-900 stat-number">{Number(pendingCount.count)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 animate-fade-in-up animate-delay-400">
        <Link 
          href="/admin/scholarships" 
          className="btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md"
        >
          Manage Scholarships
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link 
          href="/admin/applications" 
          className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-6 py-3 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-200"
        >
          Review Applications
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/admin/programs"
          className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-6 py-3 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-200"
        >
          Edit Study Programs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
