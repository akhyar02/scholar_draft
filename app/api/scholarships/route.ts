import { NextRequest } from "next/server";
import { sql } from "kysely";

import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/http";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";

export async function GET(request: NextRequest) {
  const db = getDb();
  const searchParams = request.nextUrl.searchParams;

  const q = searchParams.get("q")?.trim();
  const educationLevel = searchParams.get("educationLevel")?.trim();
  const status = searchParams.get("status");

  let query = db
    .selectFrom("scholarships")
    .select([
      "id",
      "title",
      "slug",
      "description",
      "image_url",
      "amount",
      "currency",
      "education_level",
      "deadline_at",
      "is_published",
      "created_at",
      "updated_at",
    ])
    .where("is_published", "=", true)
    .orderBy("deadline_at", "asc");

  if (q) {
    query = query.where((eb) =>
      eb.or([
        eb("title", "ilike", `%${q}%`),
        eb("description", "ilike", `%${q}%`),
        eb("eligibility_text", "ilike", `%${q}%`),
      ]),
    );
  }

  if (educationLevel) {
    query = query.where("education_level", "ilike", `%${educationLevel}%`);
  }

  if (status === "open") {
    query = query.where("deadline_at", ">", sql<Date>`now()`);
  }

  if (status === "closed") {
    query = query.where("deadline_at", "<=", sql<Date>`now()`);
  }

  const scholarships = await query.execute();
  const scholarshipsWithResolvedImageUrls = await Promise.all(
    scholarships.map(async (item) => ({
      ...item,
      image_url: await resolveStoredObjectUrl(item.image_url),
    })),
  );

  return jsonOk({
    scholarships: scholarshipsWithResolvedImageUrls.map((item) => ({
      ...item,
      isOpen: new Date(item.deadline_at) > new Date(),
    })),
  });
}
