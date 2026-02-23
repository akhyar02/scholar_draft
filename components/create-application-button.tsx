"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateApplicationButton({ scholarshipId }: { scholarshipId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onApply() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/student/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scholarshipId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to create application");
      }

      router.push(`/student/applications/${data.applicationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 transition-all"
      >
        {loading ? "Creating..." : "Start Application"}
      </button>
      {error ? <p className="text-sm text-danger-600">{error}</p> : null}
    </div>
  );
}
