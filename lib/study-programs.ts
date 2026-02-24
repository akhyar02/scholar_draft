import type { Kysely } from "kysely";

import { getDb } from "@/lib/db";
import type { DB } from "@/lib/db/types";

type DbOrTransaction = Kysely<DB>;

export function normalizeStudyProgramName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function listStudyPrograms(db: DbOrTransaction = getDb()) {
  return db
    .selectFrom("study_programs")
    .select(["id", "name", "sort_order"])
    .orderBy("sort_order", "asc")
    .orderBy("name", "asc")
    .execute();
}

export async function studyProgramExists(programName: string, db: DbOrTransaction = getDb()) {
  const normalized = normalizeStudyProgramName(programName);
  if (!normalized) {
    return false;
  }

  const row = await db
    .selectFrom("study_programs")
    .select("id")
    .where("name", "=", normalized)
    .executeTakeFirst();

  return Boolean(row);
}
