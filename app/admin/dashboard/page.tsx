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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Admin Dashboard</h1>
          <p className="mt-2 text-surface-600">Overview of scholarships and applications.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-50 text-primary-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Total Scholarships</p>
              <p className="text-3xl font-bold text-surface-900">{Number(scholarshipsCount.count)}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-info-50 text-info-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Total Applications</p>
              <p className="text-3xl font-bold text-surface-900">{Number(applicationsCount.count)}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-warning-50 text-warning-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Review Queue</p>
              <p className="text-3xl font-bold text-surface-900">{Number(pendingCount.count)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link 
          href="/admin/scholarships" 
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
        >
          Manage Scholarships
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link 
          href="/admin/applications" 
          className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 hover:bg-surface-50 transition-colors"
        >
          Review Applications
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/admin/programs"
          className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 hover:bg-surface-50 transition-colors"
        >
          Edit Study Programs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
