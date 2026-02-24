import Link from "next/link";
import { FileText, Clock, Award, ArrowRight, Sparkles } from "lucide-react";

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Student Dashboard</h1>
          <p className="mt-2 text-surface-500">Welcome back! Here's an overview of your applications.</p>
        </div>
        <Link 
          href="/student/applications" 
          className="btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md"
        >
          Manage Applications
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card-hover relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-100">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-[3rem] bg-linear-to-bl from-info-100/80 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-info-50 to-info-100 text-info-600 shadow-sm ring-1 ring-info-200/40">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Total Applications</p>
              <p className="text-3xl font-bold text-surface-900 stat-number">{applications.length}</p>
            </div>
          </div>
        </div>

        <div className="card-hover relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-200">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-[3rem] bg-linear-to-bl from-warning-100/80 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-warning-50 to-warning-100 text-warning-600 shadow-sm ring-1 ring-warning-200/40">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Under Review</p>
              <p className="text-3xl font-bold text-surface-900 stat-number">{counts.under_review ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="card-hover relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-300">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-[3rem] bg-linear-to-bl from-success-100/80 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-success-50 to-success-100 text-success-600 shadow-sm ring-1 ring-success-200/40">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Awarded</p>
              <p className="text-3xl font-bold text-surface-900 stat-number">{counts.awarded ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-50 via-white to-accent-50 p-8 ring-1 ring-primary-100/60 animate-fade-in-up animate-delay-400">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary-200/30 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-accent-200/20 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900">Discover New Opportunities</h2>
              <p className="mt-1 text-surface-500">
                We've added new scholarships that match your profile. Don't miss out!
              </p>
            </div>
          </div>
          <Link 
            href="/scholarships" 
            className="shrink-0 rounded-xl bg-surface-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/20"
          >
            Browse Scholarships
          </Link>
        </div>
      </div>
    </div>
  );
}
