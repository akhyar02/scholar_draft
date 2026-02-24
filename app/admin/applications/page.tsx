import Link from "next/link";
import { ArrowRight, User, Inbox } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/constants";
import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
}) {
  await requirePageUser("admin");
  const db = getDb();
  const params = (await searchParams) ?? {};
  const qParam = toArray(params.q)[0] ?? "";
  const q = qParam.trim();
  const selectedStatuses = toArray(params.status).filter(isApplicationStatus);
  const hasActiveFilters = q.length > 0 || selectedStatuses.length > 0;

  let query = db
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
    .orderBy("a.updated_at", "desc");

  if (selectedStatuses.length > 0) {
    query = query.where("a.status", "in", selectedStatuses);
  }

  if (q) {
    query = query.where((eb) =>
      eb.or([
        eb("p.full_name", "ilike", `%${q}%`),
        eb("u.email", "ilike", `%${q}%`),
      ]),
    );
  }

  const applications = await query.execute();

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-surface-900">Application Review Queue</h1>
        <p className="mt-2 text-surface-500">Review and manage student scholarship applications.</p>
      </div>

      <form
        method="GET"
        className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-100"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-surface-700">Search student</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name or email"
              className="mt-2 w-full rounded-xl border-0 bg-surface-50 px-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Apply
            </button>
            <Link
              href="/admin/applications"
              className="inline-flex items-center justify-center rounded-xl bg-surface-100 px-4 py-2.5 text-sm font-semibold text-surface-700 transition-colors hover:bg-surface-200"
            >
              Clear
            </Link>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-surface-700">Stage status</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {APPLICATION_STATUSES.map((status) => {
              const checked = selectedStatuses.includes(status);
              return (
                <label key={status} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="status"
                    value={status}
                    defaultChecked={checked}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-surface-600 ring-1 ring-surface-200 transition-colors hover:bg-surface-50 peer-checked:bg-primary-50 peer-checked:text-primary-700 peer-checked:ring-primary-200">
                    {STATUS_LABELS[status]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </form>

      <div className="text-sm text-surface-500 animate-fade-in-up animate-delay-100">
        {applications.length} {applications.length === 1 ? "application" : "applications"}
        {hasActiveFilters ? " match the current filters." : " in the review queue."}
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-surface-200 bg-white/60 p-16 text-center backdrop-blur-sm animate-fade-in-up animate-delay-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 text-surface-400">
            <Inbox className="h-8 w-8" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-surface-900">
            {hasActiveFilters ? "No matching applications" : "No applications yet"}
          </h3>
          <p className="mt-2 text-surface-500">
            {hasActiveFilters
              ? "Try changing the search term or stage status filters."
              : "There are currently no applications to review."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((application, i) => (
            <article
              key={application.id}
              className={`card-hover group relative flex min-w-0 flex-col justify-between gap-4 rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm sm:flex-row sm:items-center animate-fade-in-up animate-delay-${Math.min(i, 3) * 100}`}
            >
              <div className="min-w-0 space-y-2">
                <h2 className="break-words text-lg font-bold text-surface-900 transition-colors group-hover:text-primary-600">
                  {application.scholarship_title}
                </h2>
                <div className="flex min-w-0 items-start gap-2 text-sm text-surface-400">
                  <User className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-all">
                    {application.student_name} ({application.student_email})
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
                <StatusBadge status={application.status} />
                <Link
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
                  href={`/admin/applications/${application.id}`}
                >
                  Open Review
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
