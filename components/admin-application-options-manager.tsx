"use client";

import { useMemo, useState } from "react";

type CourseNode = {
  id: string;
  label: string;
  sort_order: number;
};

type FacultyNode = {
  id: string;
  label: string;
  sort_order: number;
  courses: CourseNode[];
};

type CampusNode = {
  id: string;
  label: string;
  sort_order: number;
  faculties: FacultyNode[];
};

type SupportProviderNode = {
  id: string;
  label: string;
  sort_order: number;
};

type ApplicationOptions = {
  campuses: CampusNode[];
  supportProviders: SupportProviderNode[];
};

function normalizeLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildInitialText(options: ApplicationOptions) {
  const campuses = options.campuses.map((campus) => campus.label).join("\n");

  const faculties = options.campuses
    .flatMap((campus) =>
      campus.faculties.map((faculty) => `${campus.label} > ${faculty.label}`),
    )
    .join("\n");

  const courses = options.campuses
    .flatMap((campus) =>
      campus.faculties.flatMap((faculty) =>
        faculty.courses.map((course) => `${campus.label} > ${faculty.label} > ${course.label}`),
      ),
    )
    .join("\n");

  const supportProviders = options.supportProviders
    .map((provider) => provider.label)
    .join("\n");

  return { campuses, faculties, courses, supportProviders };
}

function parseTreeFromText(params: {
  campusesText: string;
  facultiesText: string;
  coursesText: string;
  providersText: string;
}) {
  const campusLabels = params.campusesText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const campusSet = new Set(campusLabels.map((item) => item.toLowerCase()));
  if (campusSet.size !== campusLabels.length) {
    throw new Error("Campus names must be unique.");
  }

  const tree = campusLabels.map((label) => ({
    label,
    faculties: [] as Array<{
      label: string;
      courses: Array<{ label: string }>;
    }>,
  }));

  const campusMap = new Map(tree.map((item) => [item.label.toLowerCase(), item]));

  const facultyLines = params.facultiesText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const facultyKeySet = new Set<string>();

  for (const line of facultyLines) {
    const [campusLabelRaw, facultyLabelRaw] = line.split(">").map(normalizeLine);

    if (!campusLabelRaw || !facultyLabelRaw) {
      throw new Error(`Invalid faculty mapping line: "${line}". Use "Campus > Faculty".`);
    }

    const campus = campusMap.get(campusLabelRaw.toLowerCase());
    if (!campus) {
      throw new Error(`Faculty mapping references unknown campus: "${campusLabelRaw}".`);
    }

    const facultyKey = `${campusLabelRaw.toLowerCase()}::${facultyLabelRaw.toLowerCase()}`;
    if (facultyKeySet.has(facultyKey)) {
      continue;
    }

    facultyKeySet.add(facultyKey);
    campus.faculties.push({
      label: facultyLabelRaw,
      courses: [],
    });
  }

  const facultyMap = new Map<string, { label: string; courses: Array<{ label: string }> }>();
  for (const campus of tree) {
    for (const faculty of campus.faculties) {
      facultyMap.set(`${campus.label.toLowerCase()}::${faculty.label.toLowerCase()}`, faculty);
    }
  }

  const courseLines = params.coursesText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const courseKeySet = new Set<string>();

  for (const line of courseLines) {
    const segments = line.split(">").map(normalizeLine);
    if (segments.length !== 3) {
      throw new Error(
        `Invalid course mapping line: "${line}". Use "Campus > Faculty > Course".`,
      );
    }

    const [campusLabelRaw, facultyLabelRaw, courseLabelRaw] = segments;

    const faculty = facultyMap.get(`${campusLabelRaw.toLowerCase()}::${facultyLabelRaw.toLowerCase()}`);
    if (!faculty) {
      throw new Error(
        `Course mapping references unknown faculty path: "${campusLabelRaw} > ${facultyLabelRaw}".`,
      );
    }

    const courseKey = `${campusLabelRaw.toLowerCase()}::${facultyLabelRaw.toLowerCase()}::${courseLabelRaw.toLowerCase()}`;
    if (courseKeySet.has(courseKey)) {
      continue;
    }

    courseKeySet.add(courseKey);
    faculty.courses.push({ label: courseLabelRaw });
  }

  const supportProviders = params.providersText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const providerSet = new Set(supportProviders.map((item) => item.toLowerCase()));
  if (providerSet.size !== supportProviders.length) {
    throw new Error("Support provider names must be unique.");
  }

  if (tree.length === 0) {
    throw new Error("At least one campus is required.");
  }

  if (supportProviders.length === 0) {
    throw new Error("At least one support provider is required.");
  }

  return {
    campuses: tree,
    supportProviders: supportProviders.map((label) => ({ label })),
  };
}

export function AdminApplicationOptionsManager({
  initialOptions,
}: {
  initialOptions: ApplicationOptions;
}) {
  const initialText = useMemo(() => buildInitialText(initialOptions), [initialOptions]);

  const [campusesText, setCampusesText] = useState(initialText.campuses);
  const [facultiesText, setFacultiesText] = useState(initialText.faculties);
  const [coursesText, setCoursesText] = useState(initialText.courses);
  const [providersText, setProvidersText] = useState(initialText.supportProviders);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = parseTreeFromText({
        campusesText,
        facultiesText,
        coursesText,
        providersText,
      });

      const response = await fetch("/api/admin/application-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Failed to save application options");
      }

      const nextText = buildInitialText(data.options as ApplicationOptions);
      setCampusesText(nextText.campuses);
      setFacultiesText(nextText.faculties);
      setCoursesText(nextText.courses);
      setProvidersText(nextText.supportProviders);
      setSuccess("Application options updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save application options");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Campuses (one per line)</label>
        <textarea
          rows={4}
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600"
          value={campusesText}
          onChange={(event) => setCampusesText(event.target.value)}
          placeholder="Cyberjaya"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Faculty Mapping (one per line)</label>
        <textarea
          rows={8}
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600"
          value={facultiesText}
          onChange={(event) => setFacultiesText(event.target.value)}
          placeholder="Cyberjaya > FCI"
        />
        <p className="text-xs text-surface-500">Format: Campus {'>'} Faculty</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Course Mapping (one per line)</label>
        <textarea
          rows={10}
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600"
          value={coursesText}
          onChange={(event) => setCoursesText(event.target.value)}
          placeholder="Cyberjaya > FCI > Foundation"
        />
        <p className="text-xs text-surface-500">Format: Campus {'>'} Faculty {'>'} Course</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Support Providers (one per line)</label>
        <textarea
          rows={6}
          className="w-full rounded-xl border-0 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-inset focus:ring-primary-600"
          value={providersText}
          onChange={(event) => setProvidersText(event.target.value)}
          placeholder="PTPTN"
          required
        />
      </div>

      <button
        className="w-full rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
        disabled={saving}
        type="submit"
      >
        {saving ? "Saving Options..." : "Save Application Options"}
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
