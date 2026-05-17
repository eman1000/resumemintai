import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.resumemintai.com"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        // Private surfaces — keep them out of the index. Crawlers can still
        // discover them via signed-in users, they just won't be ranked.
        disallow: [
          "/account",
          "/login",
          "/logout",
          "/builder",
          "/billing/",
          "/dcb/",
          "/templates-admin",
          "/templates/import",
          "/unsubscribe",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
