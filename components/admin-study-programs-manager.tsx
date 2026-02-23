"use client";

import { useMemo, useState } from "react";

type StudyProgram = {
  id: string;
  name: string;
  sort_order: number;
};

export function AdminStudyProgramsManager({
  initialPrograms,
}: {
  initialPrograms: StudyProgram[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lines, setLines] = useState(() => initialPrograms.map((program) => program.name).join("\n"));

  const count = useMemo(
    () => lines.split("\n").map((line) => line.trim()).filter(Boolean).length,
    [lines],
  );

  async function savePrograms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const programs = lines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const response = await fetch("/api/admin/study-programs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programs }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to save study programs");
      }

      setLines((data.programs as StudyProgram[]).map((program) => program.name).join("\n"));
      setSuccess("Study programs updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save study programs");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={savePrograms} className="space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Programs (one per line)</label>
        <textarea
          rows={14}
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
          value={lines}
          onChange={(event) => setLines(event.target.value)}
          placeholder="Bachelor of Computer Science"
          required
        />
        <p className="text-xs text-surface-500">
          {count} program{count === 1 ? "" : "s"} configured. Order follows the lines above.
        </p>
      </div>

      <button
        className="w-full rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 transition-colors"
        disabled={saving}
        type="submit"
      >
        {saving ? "Saving Programs..." : "Save Programs"}
      </button>

      {error ? (
        <div className="rounded-lg bg-danger-50 p-4 text-sm text-danger-700 ring-1 ring-danger-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-lg bg-success-50 p-4 text-sm text-success-700 ring-1 ring-success-200">
          {success}
        </div>
      ) : null}
    </form>
  );
}
