"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminApi } from "@/lib/api/services/admin-client";

export function AdminScholarshipRow({
  scholarship,
}: {
  scholarship: {
    id: string;
    title: string;
    deadline_at: string;
    is_published: boolean;
  };
}) {
  const router = useRouter();
  const [publishLoading, setPublishLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = publishLoading || deleteLoading;

  async function togglePublish() {
    setPublishLoading(true);
    setError(null);

    try {
      await adminApi.updateScholarship(scholarship.id, {
        isPublished: !scholarship.is_published,
      });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update scholarship");
    } finally {
      setPublishLoading(false);
    }
  }

  async function deleteScholarship() {
    const confirmed = window.confirm(
      `Delete "${scholarship.title}"? This will permanently remove the scholarship and its related applications.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleteLoading(true);
    setError(null);

    try {
      await adminApi.deleteScholarship(scholarship.id);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete scholarship");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <article className="p-6 transition-all duration-200 hover:bg-surface-50/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-surface-900">{scholarship.title}</h3>
          <p className="text-sm text-surface-400">Deadline: {new Date(scholarship.deadline_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span 
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
              scholarship.is_published 
                ? "bg-success-50 text-success-700 ring-success-200/60" 
                : "bg-surface-100 text-surface-600 ring-surface-200/60"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${scholarship.is_published ? "bg-success-500" : "bg-surface-400"}`} />
            {scholarship.is_published ? "Published" : "Draft"}
          </span>
          <Link
            href={`/admin/scholarships/${scholarship.id}`}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 hover:bg-surface-50 hover:ring-surface-300 transition-all duration-200"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={togglePublish}
            disabled={isBusy}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 hover:bg-surface-50 hover:ring-surface-300 disabled:opacity-50 transition-all duration-200"
          >
            {publishLoading ? "Saving..." : scholarship.is_published ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            onClick={deleteScholarship}
            disabled={isBusy}
            className="rounded-xl bg-linear-to-r from-danger-600 to-danger-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-danger-500 hover:to-danger-400 disabled:opacity-50 transition-all duration-200"
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      {error ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-danger-50/80 px-4 py-2.5 ring-1 ring-danger-100">
          <span className="h-1.5 w-1.5 rounded-full bg-danger-500" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      ) : null}
    </article>
  );
}
