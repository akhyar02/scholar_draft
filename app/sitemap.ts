import type { MetadataRoute } from "next";

import { getDb } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const db = getDb();

  const scholarships = await db
    .selectFrom("scholarships")
    .select(["slug", "updated_at"])
    .where("is_published", "=", true)
    .orderBy("updated_at", "desc")
    .execute();

  return [
    {
      url: siteUrl,
      lastModified: now,
    },
    {
      url: `${siteUrl}/scholarships`,
      lastModified: now,
    },
    ...scholarships.map((scholarship) => ({
      url: `${siteUrl}/scholarships/${scholarship.slug}`,
      lastModified: new Date(scholarship.updated_at),
    })),
  ];
}
