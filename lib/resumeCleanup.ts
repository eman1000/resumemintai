// lib/resumeCleanup.ts
//
// LLM-assisted cleanup of resume data. v1 targets SKILLS — the most common
// place parsing/import artifacts show up (e.g. "A/B testing" split into "A" and
// "B testing", ALL-CAPS noise, duplicates, stray fragments). It is deliberately
// conservative: it only repairs artifacts, NEVER invents, rephrases, or adds
// content. The route returns a human-readable diff so the user reviews changes
// before they are applied (no silent rewrites).

import OpenAI from "openai";

type AnyRec = Record<string, any>;

export type CleanupChange = {
  section: string;        // e.g. "Skills"
  type: "merge" | "rename" | "remove" | "dedupe";
  before: string;         // what it was (joined if a merge)
  after: string;          // what it becomes ("" for removals)
};

export type CleanupResult = {
  changes: CleanupChange[];
  cleanedData: AnyRec;
};

function norm(k: string): string {
  return String(k || "").toLowerCase().replace(/\s+/g, "");
}

function sectionByKey(data: AnyRec, key: string): AnyRec | undefined {
  return (data?.sections || []).find((s: AnyRec) => norm(s?.key) === norm(key));
}

/** Read a skills record's display name, supporting positional-array and object
 * value shapes (same convention as lib/jsonResume.ts). */
function skillName(section: AnyRec, rec: AnyRec): string {
  const v = rec?.values;
  if (Array.isArray(v)) {
    const defs: AnyRec[] = Array.isArray(section?.fields) ? section.fields : [];
    const i = defs.findIndex((f) => (f?.role || f?.key) === "header");
    return String((i >= 0 ? v[i] : v[0]) || "").trim();
  }
  if (v && typeof v === "object") return String(v.header || v.name || "").trim();
  return "";
}

/** Ask the model to clean a flat list of skill strings. The model returns BOTH
 * the cleaned list AND a description of each change it made (more reliable than
 * reverse-engineering a diff, especially for merges of short tokens). Returns
 * null if no LLM is configured / it fails. */
async function cleanSkillsWithLLM(
  skills: string[],
): Promise<{ skills: string[]; changes: CleanupChange[] } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !skills.length) return null;

  const system =
    "You clean up the SKILLS list of a resume. You ONLY repair artifacts from " +
    "bad parsing. You MUST NOT invent new skills, rephrase, expand abbreviations, " +
    "translate, or add anything. Repairs you may make: (1) re-join a skill that " +
    'was wrongly split across entries (e.g. "A" + "B testing" -> "A/B testing", ' +
    '"CI" + "CD" -> "CI/CD"); (2) remove exact/near duplicates, keeping the best ' +
    "form; (3) fix clearly broken casing (e.g. random ShOuTing) but KEEP real " +
    'acronyms (AI, SQL, AWS, CI/CD) and do not restyle deliberate casing; ' +
    "(4) drop entries that are not real skills (single stray letters, empty or " +
    "garbage fragments). Keep the original order as much as possible.\n\n" +
    'Return STRICT JSON: {"skills": string[], "changes": [{"action": ' +
    '"merge"|"rename"|"remove"|"dedupe", "before": string, "after": string}]}. ' +
    'For a merge, set "before" to the joined originals (e.g. "A + B testing") ' +
    'and "after" to the result. For remove/dedupe, set "after" to "". List ONLY ' +
    "items you actually changed. If nothing needs fixing, return the original " +
    "list with an empty changes array.";

  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 1500,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify({ skills }) },
    ],
  });

  const raw = res.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const out = Array.isArray(parsed?.skills) ? parsed.skills : null;
    if (!out) return null;
    const cleaned = out.map((s: any) => String(s || "").trim()).filter(Boolean);
    const validActions = new Set(["merge", "rename", "remove", "dedupe"]);
    const changes: CleanupChange[] = (Array.isArray(parsed?.changes) ? parsed.changes : [])
      .filter((c: any) => c && validActions.has(c.action))
      .map((c: any) => ({
        section: "Skills",
        type: c.action,
        before: String(c.before || "").trim(),
        after: String(c.after || "").trim(),
      }))
      .filter((c: CleanupChange) => c.before || c.after);
    // Drop redundant remove/dedupe rows for a token already shown inside a
    // merge's "before" (e.g. "A" listed separately after "A + B testing").
    const mergedTokens = new Set(
      changes
        .filter((c) => c.type === "merge")
        .flatMap((c) => c.before.split(/\s*\+\s*/).map((s) => s.trim().toLowerCase())),
    );
    const deduped = changes.filter(
      (c) => !((c.type === "remove" || c.type === "dedupe") && mergedTokens.has(c.before.toLowerCase())),
    );
    return { skills: cleaned, changes: deduped };
  } catch {
    return null;
  }
}

/** Rebuild the skills section's records from a cleaned name list, preserving each
 * skill's secondary value (e.g. level) when the name is unchanged. */
function applySkills(section: AnyRec, cleaned: string[]): void {
  const defs: AnyRec[] = Array.isArray(section?.fields) ? section.fields : [];
  const headerIdx = Math.max(0, defs.findIndex((f) => (f?.role || f?.key) === "header"));
  const usesArray = (section.records || []).some((r: AnyRec) => Array.isArray(r?.values));

  // Map existing name (lower) -> original record, to keep levels where possible.
  const byName = new Map<string, AnyRec>();
  for (const r of section.records || []) byName.set(skillName(section, r).toLowerCase(), r);

  let counter = 0;
  section.records = cleaned.map((name) => {
    const existing = byName.get(name.toLowerCase());
    if (existing) return existing; // unchanged skill — keep record verbatim (incl. level)
    const key = `skill-clean-${counter++}`;
    if (usesArray) {
      const values: any[] = [];
      values[headerIdx] = name;
      return { key, values };
    }
    return { key, values: { header: name } };
  });
}

/** Clean a full resume (v1: skills). Returns the proposed changes and a deep
 * copy of the data with those changes applied. */
export async function cleanupResume(data: AnyRec): Promise<CleanupResult> {
  const cleanedData: AnyRec = JSON.parse(JSON.stringify(data || {}));
  const changes: CleanupChange[] = [];

  const skSec = sectionByKey(cleanedData, "skills");
  if (skSec && Array.isArray(skSec.records) && skSec.records.length) {
    const before = skSec.records.map((r: AnyRec) => skillName(skSec, r)).filter(Boolean);
    const result = await cleanSkillsWithLLM(before);
    if (result && result.skills.length) {
      const sameList =
        result.skills.length === before.length &&
        result.skills.every((s, i) => s === before[i]);
      if (!sameList) {
        changes.push(...result.changes);
        applySkills(skSec, result.skills);
      }
    }
  }

  return { changes, cleanedData };
}
