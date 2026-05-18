import type { MetadataRoute } from "next";
import { getAllResumeExampleSlugs } from "@/lib/resumeExamples";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.resumemintai.com"
).replace(/\/$/, "");

type Entry = {
  path: string;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
};

const STATIC_ROUTES: Entry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/resume-checker", changeFrequency: "weekly", priority: 0.95 },
  { path: "/resume-examples", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/templates", changeFrequency: "weekly", priority: 0.9 },
  { path: "/cover-letter-templates", changeFrequency: "weekly", priority: 0.8 },
  { path: "/features", changeFrequency: "monthly", priority: 0.7 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.7 },
  { path: "/reviews", changeFrequency: "weekly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/jobs", changeFrequency: "daily", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refund", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const resumeExampleEntries: MetadataRoute.Sitemap = getAllResumeExampleSlugs().map(
    (slug) => ({
      url: `${SITE_URL}/resume-examples/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    }),
  );

  return [...staticEntries, ...resumeExampleEntries];
}
