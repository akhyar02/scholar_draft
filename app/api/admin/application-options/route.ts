import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { listApplicationOptionsTree, normalizeOptionLabel } from "@/lib/application-options";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { updateApplicationOptionsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const options = await listApplicationOptionsTree();
  return jsonOk({ options });
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateApplicationOptionsSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const dedupedCampuses: Array<{
    id: string;
    label: string;
    faculties: Array<{
      id: string;
      label: string;
      courses: Array<{
        id: string;
        label: string;
      }>;
    }>;
  }> = [];

  const seenCampuses = new Set<string>();

  for (const campus of parsed.data.campuses) {
    const campusLabel = normalizeOptionLabel(campus.label);
    if (!campusLabel) {
      continue;
    }

    const campusKey = campusLabel.toLowerCase();
    if (seenCampuses.has(campusKey)) {
      continue;
    }

    seenCampuses.add(campusKey);

    const seenFaculties = new Set<string>();
    const faculties: Array<{ id: string; label: string; courses: Array<{ id: string; label: string }> }> = [];

    for (const faculty of campus.faculties) {
      const facultyLabel = normalizeOptionLabel(faculty.label);
      if (!facultyLabel) {
        continue;
      }

      const facultyKey = facultyLabel.toLowerCase();
      if (seenFaculties.has(facultyKey)) {
        continue;
      }
      seenFaculties.add(facultyKey);

      const seenCourses = new Set<string>();
      const courses: Array<{ id: string; label: string }> = [];

      for (const course of faculty.courses) {
        const courseLabel = normalizeOptionLabel(course.label);
        if (!courseLabel) {
          continue;
        }

        const courseKey = courseLabel.toLowerCase();
        if (seenCourses.has(courseKey)) {
          continue;
        }

        seenCourses.add(courseKey);
        courses.push({
          id: course.id ?? crypto.randomUUID(),
          label: courseLabel,
        });
      }

      faculties.push({
        id: faculty.id ?? crypto.randomUUID(),
        label: facultyLabel,
        courses,
      });
    }

    dedupedCampuses.push({
      id: campus.id ?? crypto.randomUUID(),
      label: campusLabel,
      faculties,
    });
  }

  if (dedupedCampuses.length === 0) {
    return jsonError(400, "INVALID_OPTIONS", "At least one campus is required");
  }

  const dedupedSupportProviders: Array<{ id: string; label: string }> = [];
  const seenProviders = new Set<string>();

  for (const provider of parsed.data.supportProviders) {
    const label = normalizeOptionLabel(provider.label);
    if (!label) {
      continue;
    }

    const key = label.toLowerCase();
    if (seenProviders.has(key)) {
      continue;
    }

    seenProviders.add(key);
    dedupedSupportProviders.push({
      id: provider.id ?? crypto.randomUUID(),
      label,
    });
  }

  if (dedupedSupportProviders.length === 0) {
    return jsonError(400, "INVALID_OPTIONS", "At least one support provider is required");
  }

  const db = getDb();

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("application_option_items").execute();

    for (let campusIndex = 0; campusIndex < dedupedCampuses.length; campusIndex += 1) {
      const campus = dedupedCampuses[campusIndex];

      await trx
        .insertInto("application_option_items")
        .values({
          id: campus.id,
          kind: "campus",
          label: campus.label,
          parent_id: null,
          sort_order: campusIndex + 1,
          is_active: true,
        })
        .execute();

      for (let facultyIndex = 0; facultyIndex < campus.faculties.length; facultyIndex += 1) {
        const faculty = campus.faculties[facultyIndex];

        await trx
          .insertInto("application_option_items")
          .values({
            id: faculty.id,
            kind: "faculty",
            label: faculty.label,
            parent_id: campus.id,
            sort_order: facultyIndex + 1,
            is_active: true,
          })
          .execute();

        for (let courseIndex = 0; courseIndex < faculty.courses.length; courseIndex += 1) {
          const course = faculty.courses[courseIndex];

          await trx
            .insertInto("application_option_items")
            .values({
              id: course.id,
              kind: "course",
              label: course.label,
              parent_id: faculty.id,
              sort_order: courseIndex + 1,
              is_active: true,
            })
            .execute();
        }
      }
    }

    for (let providerIndex = 0; providerIndex < dedupedSupportProviders.length; providerIndex += 1) {
      const provider = dedupedSupportProviders[providerIndex];

      await trx
        .insertInto("application_option_items")
        .values({
          id: provider.id,
          kind: "support_provider",
          label: provider.label,
          parent_id: null,
          sort_order: providerIndex + 1,
          is_active: true,
        })
        .execute();
    }
  });

  const options = await listApplicationOptionsTree();
  return jsonOk({ options });
}
