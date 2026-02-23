"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      const response = await fetch(`/api/admin/scholarships/${scholarship.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !scholarship.is_published }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to update scholarship");
      }

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
      const response = await fetch(`/api/admin/scholarships/${scholarship.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to delete scholarship");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete scholarship");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <article className="p-6 transition-colors hover:bg-surface-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-surface-900">{scholarship.title}</h3>
          <p className="text-sm text-surface-500">Deadline: {new Date(scholarship.deadline_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <span 
            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
              scholarship.is_published 
                ? "bg-success-50 text-success-700 ring-success-200" 
                : "bg-surface-100 text-surface-700 ring-surface-200"
            }`}
          >
            {scholarship.is_published ? "Published" : "Draft"}
          </span>
          <Link
            href={`/admin/scholarships/${scholarship.id}`}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 hover:bg-surface-50 transition-colors"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={togglePublish}
            disabled={isBusy}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 hover:bg-surface-50 disabled:opacity-50 transition-colors"
          >
            {publishLoading ? "Saving..." : scholarship.is_published ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            onClick={deleteScholarship}
            disabled={isBusy}
            className="rounded-md bg-danger-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger-500 disabled:opacity-50 transition-colors"
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-danger-700">{error}</p>
      ) : null}
    </article>
  );
}
