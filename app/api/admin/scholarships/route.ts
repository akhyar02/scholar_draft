import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { scholarshipCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const db = getDb();
  const scholarships = await db
    .selectFrom("scholarships")
    .selectAll()
    .orderBy("created_at", "desc")
    .execute();

  return jsonOk({ scholarships });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = scholarshipCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const data = parsed.data;
  const db = getDb();
  const id = crypto.randomUUID();
  const candidateSlug = data.slug ?? slugify(data.title);

  const existing = await db
    .selectFrom("scholarships")
    .select("id")
    .where("slug", "=", candidateSlug)
    .executeTakeFirst();

  if (existing) {
    return jsonError(409, "SLUG_EXISTS", "Slug already exists");
  }

  const scholarship = await db
    .insertInto("scholarships")
    .values({
      id,
      title: data.title,
      slug: candidateSlug,
      description: data.description,
      image_url: data.imageKey ?? null,
      amount: data.amount,
      currency: data.currency,
      education_level: data.educationLevel,
      eligibility_text: data.eligibilityText,
      deadline_at: new Date(data.deadlineAt),
      is_published: data.isPublished,
      created_by: auth.user.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return jsonOk({ scholarship }, { status: 201 });
}
