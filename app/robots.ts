import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/student",
        "/api",
        "/login",
        "/forgot-password",
        "/set-password",
        "/unauthorized",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

