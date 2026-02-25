"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { ArrowRight, User, Inbox, ChevronLeft, ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { AdminApplicationsFilters } from "@/components/admin-applications-filters";
import { fetchApplicationsPage, PAGE_SIZE } from "@/app/admin/applications/actions";
import type { ApplicationRow, FetchApplicationsResult } from "@/app/admin/applications/actions";
import type { ApplicationStatus } from "@/lib/constants";

export type { ApplicationRow };

interface Props {
  initialData: FetchApplicationsResult;
}

export function AdminApplicationsClient({ initialData }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [q, setQ] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<ApplicationStatus[]>([]);
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState(initialData.applications);
  const [total, setTotal] = useState(initialData.total);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(async () => {
      const result = await fetchApplicationsPage({ page, q, statuses: selectedStatuses });
      setApplications(result.applications);
      setTotal(result.total);
    });
  }, [page, q, selectedStatuses]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = q.length > 0 || selectedStatuses.length > 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  function toggleStatus(status: ApplicationStatus) {
    setPage(1);
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(inputValue);
  }

  function handleClear() {
    setInputValue("");
    setQ("");
    setSelectedStatuses([]);
    setPage(1);
  }

  return (
    <>
      <AdminApplicationsFilters
        inputValue={inputValue}
        onInputChange={setInputValue}
        selectedStatuses={selectedStatuses}
        onStatusToggle={toggleStatus}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <div className="flex items-center justify-between text-sm text-surface-500 animate-fade-in-up animate-delay-100">
        <span>
          {total === 0
            ? "No applications"
            : `${rangeStart}–${rangeEnd} of ${total} ${total === 1 ? "application" : "applications"}`}
          {hasActiveFilters ? " match the current filters." : " in the review queue."}
        </span>
        {isPending && (
          <span className="text-xs text-surface-400">Loading…</span>
        )}
      </div>

      {applications.length === 0 && !isPending ? (
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
        <div className={`grid gap-4 transition-opacity duration-150 ${isPending ? "opacity-50" : "opacity-100"}`}>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 animate-fade-in-up animate-delay-200">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1 || isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 px-3 py-2 text-sm font-semibold text-surface-700 transition-colors hover:bg-surface-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="text-sm text-surface-500">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages || isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 px-3 py-2 text-sm font-semibold text-surface-700 transition-colors hover:bg-surface-200 disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
