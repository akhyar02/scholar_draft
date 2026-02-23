import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { listStudyPrograms, normalizeStudyProgramName } from "@/lib/study-programs";
import { updateStudyProgramsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const programs = await listStudyPrograms();
  return jsonOk({ programs });
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateStudyProgramsSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const deduplicatedPrograms: string[] = [];
  const seen = new Set<string>();

  for (const program of parsed.data.programs) {
    const normalized = normalizeStudyProgramName(program);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduplicatedPrograms.push(normalized);
  }

  if (deduplicatedPrograms.length === 0) {
    return jsonError(400, "INVALID_PROGRAMS", "At least one unique program is required");
  }

  const db = getDb();
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("study_programs").execute();

    await trx
      .insertInto("study_programs")
      .values(
        deduplicatedPrograms.map((name, index) => ({
          id: crypto.randomUUID(),
          name,
          sort_order: index + 1,
        })),
      )
      .execute();
  });

  const programs = await listStudyPrograms();
  return jsonOk({ programs });
}
