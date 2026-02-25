"use client";

import { useRef } from "react";
import Link from "next/link";

import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { ApplicationStatus } from "@/lib/constants";

interface Props {
  q: string;
  selectedStatuses: ApplicationStatus[];
}

export function AdminApplicationsFilters({ q, selectedStatuses }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
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
            Search
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
                  onChange={() => formRef.current?.submit()}
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
  );
}
