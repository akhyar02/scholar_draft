"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { adminApi } from "@/lib/api/services/admin-client";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/constants";

export function AdminStatusControls({
  applicationId,
  currentStatus,
  initialAdminNotes,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
  initialAdminNotes: string | null;
}) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState<ApplicationStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitStatus() {
    setLoading(true);
    setError(null);

    try {
      await adminApi.updateApplicationStatus(applicationId, { toStatus, reason, adminNotes });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function reopen() {
    setLoading(true);
    setError(null);

    try {
      await adminApi.reopenApplication(applicationId, {
        reason: reason || "Reopened by admin",
      });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reopen application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 rounded-lg bg-white p-6 shadow-sm ring-1 ring-surface-200">
      <h3 className="text-lg font-bold text-surface-900">Review Controls</h3>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Transition To</label>
        <select
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          value={toStatus}
          onChange={(event) => setToStatus(event.target.value as ApplicationStatus)}
        >
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Reason (Optional)</label>
        <textarea
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          placeholder="Explain the status change..."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Admin Notes (Internal)</label>
        <textarea
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          placeholder="Private notes for other admins..."
          value={adminNotes}
          onChange={(event) => setAdminNotes(event.target.value)}
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={submitStatus}
          disabled={loading}
          className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Update Status"}
        </button>
        <button
          type="button"
          onClick={reopen}
          disabled={loading}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 hover:bg-surface-50 disabled:opacity-50 transition-colors"
        >
          Reopen to Draft
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700 ring-1 ring-danger-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
