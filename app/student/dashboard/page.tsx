import Link from "next/link";
import { FileText, Clock, Award, ArrowRight } from "lucide-react";

import { requirePageUser } from "@/lib/page-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requirePageUser("student");
  const db = getDb();

  const applications = await db
    .selectFrom("applications")
    .select(["status"])
    .where("student_user_id", "=", user.id)
    .execute();

  const counts = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Student Dashboard</h1>
          <p className="mt-2 text-surface-600">Welcome back! Here's an overview of your applications.</p>
        </div>
        <Link 
          href="/student/applications" 
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-colors"
        >
          Manage Applications
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-info-50 text-info-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Total Applications</p>
              <p className="text-3xl font-bold text-surface-900">{applications.length}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-warning-50 text-warning-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Under Review</p>
              <p className="text-3xl font-bold text-surface-900">{counts.under_review ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-success-50 text-success-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Awarded</p>
              <p className="text-3xl font-bold text-surface-900">{counts.awarded ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg bg-primary-50 p-8 ring-1 ring-primary-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-primary-900">Discover New Opportunities</h2>
            <p className="mt-2 text-primary-700">
              We've added new scholarships that match your profile. Don't miss out on funding your education.
            </p>
          </div>
          <Link 
            href="/scholarships" 
            className="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-sm ring-1 ring-inset ring-primary-200 hover:bg-primary-50 transition-colors"
          >
            Browse Scholarships
          </Link>
        </div>
      </div>
    </div>
  );
}
