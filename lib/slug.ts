// lib/slug.ts — URL-safe slugs for public job postings (/careers/[slug]).

/** Lowercase, hyphenated, ASCII-only slug from arbitrary text. */
export function slugify(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Short random-ish suffix derived from a uuid so slugs stay unique without a
 * DB round-trip. Scripts can't use Math.random, but route handlers can. */
export function shortSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Build a posting slug: "senior-backend-engineer-acme-a1b2c3". */
export function jobSlug(title: string, company: string): string {
  const base = [slugify(title), slugify(company)].filter(Boolean).join("-").slice(0, 70);
  return `${base || "job"}-${shortSuffix()}`;
}
