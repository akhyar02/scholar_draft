import type { Kysely } from "kysely";

import type { ApplicationOptionKind } from "@/lib/constants";
import { getDb } from "@/lib/db";
import type { DB } from "@/lib/db/types";

type DbOrTransaction = Kysely<DB>;

type BaseOption = {
  id: string;
  label: string;
  sort_order: number;
};

export type CourseOptionNode = BaseOption;
export type FacultyOptionNode = BaseOption & {
  courses: CourseOptionNode[];
};
export type CampusOptionNode = BaseOption & {
  faculties: FacultyOptionNode[];
};

export type ApplicationOptionsTree = {
  campuses: CampusOptionNode[];
  supportProviders: BaseOption[];
};

export type OptionTreeInput = {
  campuses: Array<{
    id?: string;
    label: string;
    faculties: Array<{
      id?: string;
      label: string;
      courses: Array<{
        id?: string;
        label: string;
      }>;
    }>;
  }>;
  supportProviders: Array<{
    id?: string;
    label: string;
  }>;
};

export function normalizeOptionLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function compareOptionLabel<T extends { label: string }>(a: T, b: T) {
  return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
}

export async function listApplicationOptionsTree(db: DbOrTransaction = getDb()) {
  const rows = await db
    .selectFrom("application_option_items")
    .select(["id", "kind", "label", "parent_id", "sort_order"])
    .where("is_active", "=", true)
    .orderBy("sort_order", "asc")
    .orderBy("label", "asc")
    .execute();

  const campuses = rows.filter((item) => item.kind === "campus");
  const faculties = rows.filter((item) => item.kind === "faculty");
  const courses = rows.filter((item) => item.kind === "course");
  const supportProviders = rows
    .filter((item) => item.kind === "support_provider")
    .map((item) => ({ id: item.id, label: item.label, sort_order: item.sort_order }))
    .sort(compareOptionLabel);

  const facultiesByCampus = new Map<string, FacultyOptionNode[]>();
  for (const faculty of faculties) {
    if (!faculty.parent_id) {
      continue;
    }

    const list = facultiesByCampus.get(faculty.parent_id) ?? [];
    list.push({
      id: faculty.id,
      label: faculty.label,
      sort_order: faculty.sort_order,
      courses: [],
    });
    facultiesByCampus.set(faculty.parent_id, list);
  }

  const coursesByFaculty = new Map<string, CourseOptionNode[]>();
  for (const course of courses) {
    if (!course.parent_id) {
      continue;
    }

    const list = coursesByFaculty.get(course.parent_id) ?? [];
    list.push({
      id: course.id,
      label: course.label,
      sort_order: course.sort_order,
    });
    coursesByFaculty.set(course.parent_id, list);
  }

  const campusTree: CampusOptionNode[] = campuses.map((campus) => {
    const campusFaculties = (facultiesByCampus.get(campus.id) ?? [])
      .map((faculty) => ({
        ...faculty,
        courses: [...(coursesByFaculty.get(faculty.id) ?? [])].sort(compareOptionLabel),
      }))
      .sort(compareOptionLabel);

    return {
      id: campus.id,
      label: campus.label,
      sort_order: campus.sort_order,
      faculties: campusFaculties,
    };
  }).sort(compareOptionLabel);

  return {
    campuses: campusTree,
    supportProviders,
  } satisfies ApplicationOptionsTree;
}

export async function getOptionById(
  id: string,
  db: DbOrTransaction = getDb(),
) {
  return db
    .selectFrom("application_option_items")
    .select(["id", "kind", "parent_id", "is_active"])
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function isOptionOfKind(
  id: string,
  kind: ApplicationOptionKind,
  db: DbOrTransaction = getDb(),
) {
  const item = await db
    .selectFrom("application_option_items")
    .select("id")
    .where("id", "=", id)
    .where("kind", "=", kind)
    .where("is_active", "=", true)
    .executeTakeFirst();

  return Boolean(item);
}

export async function isValidCampusFacultyCoursePath(
  campusId: string,
  facultyId: string,
  courseId: string,
  db: DbOrTransaction = getDb(),
) {
  const [campus, faculty, course] = await Promise.all([
    db
      .selectFrom("application_option_items")
      .select(["id", "kind", "is_active"])
      .where("id", "=", campusId)
      .executeTakeFirst(),
    db
      .selectFrom("application_option_items")
      .select(["id", "kind", "parent_id", "is_active"])
      .where("id", "=", facultyId)
      .executeTakeFirst(),
    db
      .selectFrom("application_option_items")
      .select(["id", "kind", "parent_id", "is_active"])
      .where("id", "=", courseId)
      .executeTakeFirst(),
  ]);

  if (!campus || !faculty || !course) {
    return false;
  }

  if (!campus.is_active || !faculty.is_active || !course.is_active) {
    return false;
  }

  if (campus.kind !== "campus" || faculty.kind !== "faculty" || course.kind !== "course") {
    return false;
  }

  if (faculty.parent_id !== campus.id) {
    return false;
  }

  return course.parent_id === faculty.id;
}
