"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type ApplicationOptionsTree as ApplicationOptions,
} from "@/lib/api/contracts";
import { adminApi } from "@/lib/api/services/admin-client";

function normalizeLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function splitNormalizedLines(text: string) {
  return text.split("\n").map(normalizeLine).filter(Boolean);
}

function appendUniqueLine(text: string, line: string) {
  const nextLine = normalizeLine(line);
  if (!nextLine) {
    return text;
  }

  const existingLines = splitNormalizedLines(text);
  const existingSet = new Set(existingLines.map((item) => item.toLowerCase()));
  if (existingSet.has(nextLine.toLowerCase())) {
    return existingLines.join("\n");
  }

  return [...existingLines, nextLine].join("\n");
}

function removeExactLine(text: string, lineToRemove: string) {
  const target = normalizeLine(lineToRemove).toLowerCase();
  return splitNormalizedLines(text)
    .filter((line) => line.toLowerCase() !== target)
    .join("\n");
}

function compareLabel(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
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
  const [facultyCampusDraft, setFacultyCampusDraft] = useState(initialOptions.campuses[0]?.label ?? "");
  const [facultyLabelDraft, setFacultyLabelDraft] = useState("");
  const [courseCampusDraft, setCourseCampusDraft] = useState(initialOptions.campuses[0]?.label ?? "");
  const [courseFacultyDraft, setCourseFacultyDraft] = useState(
    initialOptions.campuses[0]?.faculties[0]?.label ?? "",
  );
  const [courseLabelDraft, setCourseLabelDraft] = useState("");

  const campusLabels = useMemo(() => {
    const labels = splitNormalizedLines(campusesText);
    const seen = new Set<string>();
    return labels
      .filter((label) => {
      const key = label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
      })
      .sort(compareLabel);
  }, [campusesText]);

  const facultyMappings = useMemo(() => {
    return splitNormalizedLines(facultiesText)
      .map((line) => {
        const segments = line.split(">").map(normalizeLine);
        if (segments.length !== 2 || !segments[0] || !segments[1]) return null;
        return {
          line,
          campus: segments[0],
          faculty: segments[1],
        };
      })
      .filter((item): item is { line: string; campus: string; faculty: string } => item !== null);
  }, [facultiesText]);

  const courseMappings = useMemo(() => {
    return splitNormalizedLines(coursesText)
      .map((line) => {
        const segments = line.split(">").map(normalizeLine);
        if (segments.length !== 3 || !segments[0] || !segments[1] || !segments[2]) return null;
        return {
          line,
          campus: segments[0],
          faculty: segments[1],
          course: segments[2],
        };
      })
      .filter(
        (item): item is { line: string; campus: string; faculty: string; course: string } => item !== null,
      )
      .sort((a, b) => {
        const campusCompare = compareLabel(a.campus, b.campus);
        if (campusCompare !== 0) return campusCompare;
        const facultyCompare = compareLabel(a.faculty, b.faculty);
        if (facultyCompare !== 0) return facultyCompare;
        return compareLabel(a.course, b.course);
      });
  }, [coursesText]);

  const facultiesByCampus = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const mapping of facultyMappings) {
      const key = mapping.campus.toLowerCase();
      const existing = map.get(key) ?? [];
      if (!existing.some((item) => item.toLowerCase() === mapping.faculty.toLowerCase())) {
        existing.push(mapping.faculty);
      }
      existing.sort(compareLabel);
      map.set(key, existing);
    }
    return map;
  }, [facultyMappings]);

  const availableCourseFaculties = useMemo(() => {
    return facultiesByCampus.get(courseCampusDraft.toLowerCase()) ?? [];
  }, [courseCampusDraft, facultiesByCampus]);

  useEffect(() => {
    if (campusLabels.length === 0) {
      setFacultyCampusDraft("");
      return;
    }

    if (!campusLabels.some((label) => label.toLowerCase() === facultyCampusDraft.toLowerCase())) {
      setFacultyCampusDraft(campusLabels[0]);
    }
  }, [campusLabels, facultyCampusDraft]);

  useEffect(() => {
    if (campusLabels.length === 0) {
      setCourseCampusDraft("");
      return;
    }

    if (!campusLabels.some((label) => label.toLowerCase() === courseCampusDraft.toLowerCase())) {
      setCourseCampusDraft(campusLabels[0]);
    }
  }, [campusLabels, courseCampusDraft]);

  useEffect(() => {
    if (availableCourseFaculties.length === 0) {
      setCourseFacultyDraft("");
      return;
    }

    if (
      !availableCourseFaculties.some(
        (faculty) => faculty.toLowerCase() === courseFacultyDraft.toLowerCase(),
      )
    ) {
      setCourseFacultyDraft(availableCourseFaculties[0]);
    }
  }, [availableCourseFaculties, courseFacultyDraft]);

  function addFacultyMapping() {
    const campus = normalizeLine(facultyCampusDraft);
    const faculty = normalizeLine(facultyLabelDraft);

    if (!campus || !faculty) {
      setError("Choose a campus and enter a faculty name.");
      return;
    }

    setFacultiesText((prev) => appendUniqueLine(prev, `${campus} > ${faculty}`));
    setFacultyLabelDraft("");
    setError(null);
    setSuccess(null);
  }

  function removeFacultyMapping(campus: string, faculty: string) {
    const facultyLine = `${campus} > ${faculty}`;
    setFacultiesText((prev) => removeExactLine(prev, facultyLine));
    setCoursesText((prev) =>
      splitNormalizedLines(prev)
        .filter((line) => {
          const segments = line.split(">").map(normalizeLine);
          return !(
            segments.length === 3 &&
            segments[0].toLowerCase() === campus.toLowerCase() &&
            segments[1].toLowerCase() === faculty.toLowerCase()
          );
        })
        .join("\n"),
    );
    setError(null);
    setSuccess(null);
  }

  function addCourseMapping() {
    const campus = normalizeLine(courseCampusDraft);
    const faculty = normalizeLine(courseFacultyDraft);
    const course = normalizeLine(courseLabelDraft);

    if (!campus || !faculty || !course) {
      setError("Choose a campus and faculty, then enter a course name.");
      return;
    }

    setCoursesText((prev) => appendUniqueLine(prev, `${campus} > ${faculty} > ${course}`));
    setCourseLabelDraft("");
    setError(null);
    setSuccess(null);
  }

  function removeCourseMapping(campus: string, faculty: string, course: string) {
    setCoursesText((prev) => removeExactLine(prev, `${campus} > ${faculty} > ${course}`));
    setError(null);
    setSuccess(null);
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const rawPayload = parseTreeFromText({
        campusesText,
        facultiesText,
        coursesText,
        providersText,
      });

      const data = await adminApi.updateApplicationOptions(rawPayload);

      const nextText = buildInitialText(data.options);
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
        <label className="text-sm font-medium text-surface-700">Faculty Mapping</label>
        <div className="rounded-xl bg-surface-50 p-3 ring-1 ring-inset ring-surface-200">
          <p className="mb-2 text-xs font-medium text-surface-600">Quick add faculty</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
            <select
              className="ui-select w-full rounded-xl border-0 bg-surface-50 pl-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400"
              value={facultyCampusDraft}
              onChange={(event) => setFacultyCampusDraft(event.target.value)}
              disabled={campusLabels.length === 0}
            >
              {campusLabels.length === 0 ? (
                <option value="">Add a campus first</option>
              ) : null}
              {campusLabels.map((campus) => (
                <option key={campus} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-primary-600"
              value={facultyLabelDraft}
              onChange={(event) => setFacultyLabelDraft(event.target.value)}
              placeholder="e.g. FCI"
            />
            <button
              type="button"
              onClick={addFacultyMapping}
              className="rounded-xl bg-surface-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={campusLabels.length === 0}
            >
              Add
            </button>
          </div>

          {campusLabels.length > 0 ? (
            <div className="mt-3 space-y-2">
              {campusLabels.map((campus) => {
                const faculties = facultiesByCampus.get(campus.toLowerCase()) ?? [];
                return (
                  <div key={campus} className="rounded-xl bg-white p-2 ring-1 ring-inset ring-surface-200">
                    <p className="text-xs font-semibold text-surface-600">{campus}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {faculties.length === 0 ? (
                        <span className="text-xs text-surface-500">No faculties yet</span>
                      ) : (
                        faculties.map((faculty) => (
                          <button
                            key={`${campus}-${faculty}`}
                            type="button"
                            onClick={() => removeFacultyMapping(campus, faculty)}
                            className="rounded-full bg-surface-100 px-3 py-1 text-xs text-surface-700 ring-1 ring-inset ring-surface-200 hover:bg-surface-200"
                            title="Remove faculty and its course mappings"
                          >
                            {faculty} ×
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-surface-700">Course Mapping</label>
        <div className="rounded-xl bg-surface-50 p-3 ring-1 ring-inset ring-surface-200">
          <p className="mb-2 text-xs font-medium text-surface-600">Quick add course</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
            <select
              className="ui-select w-full rounded-xl border-0 bg-surface-50 pl-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400"
              value={courseCampusDraft}
              onChange={(event) => setCourseCampusDraft(event.target.value)}
              disabled={campusLabels.length === 0}
            >
              {campusLabels.length === 0 ? (
                <option value="">Add a campus first</option>
              ) : null}
              {campusLabels.map((campus) => (
                <option key={campus} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
            <select
              className="ui-select w-full rounded-xl border-0 bg-surface-50 pl-4 py-2.5 text-sm text-surface-900 ring-1 ring-surface-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed disabled:text-surface-400"
              value={courseFacultyDraft}
              onChange={(event) => setCourseFacultyDraft(event.target.value)}
              disabled={availableCourseFaculties.length === 0}
            >
              {availableCourseFaculties.length === 0 ? (
                <option value="">Add a faculty first</option>
              ) : null}
              {availableCourseFaculties.map((faculty) => (
                <option key={`${courseCampusDraft}-${faculty}`} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 focus:ring-2 focus:ring-primary-600"
              value={courseLabelDraft}
              onChange={(event) => setCourseLabelDraft(event.target.value)}
              placeholder="e.g. Foundation"
            />
            <button
              type="button"
              onClick={addCourseMapping}
              className="rounded-xl bg-surface-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={campusLabels.length === 0 || availableCourseFaculties.length === 0}
            >
              Add
            </button>
          </div>

          {campusLabels.length > 0 ? (
            <div className="mt-3 space-y-2">
              {campusLabels.map((campus) => {
                const faculties = facultiesByCampus.get(campus.toLowerCase()) ?? [];
                if (faculties.length === 0) {
                  return null;
                }

                return (
                  <div key={`courses-${campus}`} className="rounded-xl bg-white p-2 ring-1 ring-inset ring-surface-200">
                    <p className="text-xs font-semibold text-surface-600">{campus}</p>
                    <div className="mt-2 space-y-2">
                      {faculties.map((faculty) => {
                        const courses = courseMappings.filter(
                          (mapping) =>
                            mapping.campus.toLowerCase() === campus.toLowerCase() &&
                            mapping.faculty.toLowerCase() === faculty.toLowerCase(),
                        );

                        return (
                          <div key={`${campus}-${faculty}`} className="rounded-xl bg-surface-50 p-2">
                            <p className="text-xs font-medium text-surface-600">{faculty}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {courses.length === 0 ? (
                                <span className="text-xs text-surface-500">No courses yet</span>
                              ) : (
                                courses.map((mapping) => (
                                  <button
                                    key={mapping.line}
                                    type="button"
                                    onClick={() =>
                                      removeCourseMapping(mapping.campus, mapping.faculty, mapping.course)
                                    }
                                    className="rounded-full bg-white px-3 py-1 text-xs text-surface-700 ring-1 ring-inset ring-surface-200 hover:bg-surface-100"
                                    title="Remove course mapping"
                                  >
                                    {mapping.course} ×
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
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
        <div className="rounded-xl bg-danger-50/80 p-4 text-sm text-danger-700 ring-1 ring-danger-100">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl bg-success-50/80 p-4 text-sm text-success-700 ring-1 ring-success-100">
          {success}
        </div>
      ) : null}
    </form>
  );
}
