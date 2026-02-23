import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveStoredObjectUrl } from "@/lib/s3-object-url";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const db = getDb();

  const scholarship = await db
    .selectFrom("scholarships")
    .selectAll()
    .where("slug", "=", slug)
    .where("is_published", "=", true)
    .executeTakeFirst();

  if (!scholarship) {
    return jsonError(404, "NOT_FOUND", "Scholarship not found");
  }

  const imageUrl = await resolveStoredObjectUrl(scholarship.image_url);

  return jsonOk({
    scholarship: {
      ...scholarship,
      image_url: imageUrl,
    },
    isOpen: new Date(scholarship.deadline_at) > new Date(),
  });
}
