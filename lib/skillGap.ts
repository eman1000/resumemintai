// lib/skillGap.ts
//
// Honesty guardrail for tailoring + cover letters: find the job's required
// skills/keywords that DON'T appear in the candidate's resume. The UI asks the
// user which of those they actually have (a checklist); generation may then use
// resume content + user-confirmed skills only — never invented ones.
//
// Client-safe (no node imports) so the builder, extension, and server share it.

/** Lowercased blob of every string in the resume data — used as a haystack. */
function resumeHaystack(data: any): string {
  try {
    return JSON.stringify(data || {}).toLowerCase();
  } catch {
    return "";
  }
}

/** Is `term` evidenced anywhere in the resume? Matches loosely (raw substring or
 * alphanumeric-squashed, so "Node.js" ~ "nodejs", "CI/CD" ~ "cicd"). */
export function resumeMentions(data: any, term: string): boolean {
  const hay = resumeHaystack(data);
  if (!hay) return false;
  const norm = String(term || "").trim().toLowerCase();
  if (!norm) return false;
  if (hay.includes(norm)) return true;
  const alnum = norm.replace(/[^a-z0-9]+/g, "");
  if (!alnum) return false;
  return hay.replace(/[^a-z0-9]+/g, "").includes(alnum);
}

// Generic JD tokens that aren't real "skills" — never worth asking about.
const STOPWORDS = new Set([
  "experience", "team", "teams", "work", "working", "ability", "strong",
  "communication", "skills", "knowledge", "years", "year", "english",
  "responsibilities", "requirements", "preferred", "plus", "etc", "role",
  "candidate", "company", "business", "developer", "engineer", "software",
]);

/** Job keywords/skills that are NOT evidenced in the resume (deduped, capped). */
export function findMissingSkills(jdKeywords: string[] | undefined, data: any, max = 18): string[] {
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const raw of jdKeywords || []) {
    const term = String(raw || "").trim();
    if (term.length < 2) continue;
    const norm = term.toLowerCase();
    if (seen.has(norm) || STOPWORDS.has(norm)) continue;
    seen.add(norm);
    if (resumeMentions(data, term)) continue;
    missing.push(term);
    if (missing.length >= max) break;
  }
  return missing;
}
