import { NextRequest } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { scholarshipPatchSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = scholarshipPatchSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(400, "INVALID_PAYLOAD", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const data = parsed.data;
  const db = getDb();

  const existing = await db
    .selectFrom("scholarships")
    .select("id")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Scholarship not found");
  }

  const nextSlug = data.slug ?? (data.title ? slugify(data.title) : undefined);

  if (nextSlug) {
    const duplicate = await db
      .selectFrom("scholarships")
      .select("id")
      .where("slug", "=", nextSlug)
      .where("id", "!=", id)
      .executeTakeFirst();

    if (duplicate) {
      return jsonError(409, "SLUG_EXISTS", "Slug already exists");
    }
  }

  const scholarship = await db
    .updateTable("scholarships")
    .set({
      ...(data.title ? { title: data.title } : {}),
      ...(nextSlug ? { slug: nextSlug } : {}),
      ...(data.description ? { description: data.description } : {}),
      ...("imageKey" in data ? { image_url: data.imageKey ?? null } : {}),
      ...(typeof data.amount === "number" ? { amount: data.amount } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      ...("educationLevel" in data ? { education_level: data.educationLevel ?? null } : {}),
      ...(data.eligibilityText ? { eligibility_text: data.eligibilityText } : {}),
      ...(data.deadlineAt ? { deadline_at: new Date(data.deadlineAt) } : {}),
      ...(typeof data.isPublished === "boolean" ? { is_published: data.isPublished } : {}),
      updated_at: new Date(),
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();

  return jsonOk({ scholarship });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request, "admin");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const db = getDb();

  const existing = await db
    .selectFrom("scholarships")
    .select("id")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Scholarship not found");
  }

  await db.deleteFrom("scholarships").where("id", "=", id).execute();

  return jsonOk({ success: true });
}
