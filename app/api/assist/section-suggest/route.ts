// app/api/assist/section-suggest/route.ts
import { NextRequest, NextResponse } from "next/server";

// ---- Types shared with the client (keep in sync) ----
type CVSectionKey =
  | "personalDetails"
  | "profile"
  | "employment"
  | "educations"
  | "skills"
  | "languages"
  | "hobbies"
  | "qualities"
  | "courses"
  | "certificates"
  | "internships"
  | "sideActivities"
  | "achievements"
  | "references"
  | "signature"
  | "footer";

type CVField = { key: string; role: string; fieldType?: string };
type CVRecord = { key: string; values: any[] };
type CVSection = { key: CVSectionKey; title: string; fields: CVField[]; records: CVRecord[]; description?: string };

type AISuggestProfile = { kind: "profile"; headline?: string; summaryHtml?: string };
type AISuggestEmploymentBullets = { kind: "employment_bullets"; recordKey?: string; bullets: string[] };
type AISuggestSkills = { kind: "skills"; items: Array<{ name: string; level?: string }> };
type AISuggestLanguages = { kind: "languages"; items: Array<{ name: string; level?: string }> };
type AISuggestHobbies = { kind: "hobbies"; items: string[] };
type AISuggestGeneric = { kind: "generic_text"; html: string };

type AISuggestResponse =
  | AISuggestProfile
  | AISuggestEmploymentBullets
  | AISuggestSkills
  | AISuggestLanguages
  | AISuggestHobbies
  | AISuggestGeneric;

// ---- Small utils ----
const pick = <T, K extends keyof T>(obj: T | undefined, keys: K[], fallback: Partial<T> = {}): Partial<T> =>
  Object.fromEntries((keys as string[]).map(k => [k, (obj as any)?.[k]])).valueOf() as any;

const sanitize = (s?: string) =>
  (s || "")
    .replace(/<script/gi, "&lt;script")
    .replace(/<\/script>/gi, "&lt;/script&gt;")
    .trim();

const bulletize = (arr: string[], take = 5) =>
  arr
    .filter(Boolean)
    .slice(0, take)
    .map(x => x.replace(/^[•\-–]\s*/g, "").trim())
    .filter((v, i, a) => v && a.indexOf(v) === i);

// ---- LLM glue (optional) ----
async function askLLM(system: string, user: string): Promise<AISuggestResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    // Using OpenAI Chat Completions JSON mode (works with most recent GPT models).
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!parsed?.suggestion) return null;
    return parsed.suggestion as AISuggestResponse;
  } catch {
    return null;
  }
}

// ---- Heuristic fallbacks by section ----
function fallbackForProfile(job: any): AISuggestResponse {
  const role = job?.role || job?.title || "Professional";
  const keywords: string[] =
    job?.keywords ||
    job?.requirements ||
    job?.skills ||
    [];
  const top = bulletize(keywords, 5).slice(0, 3);

  return {
    kind: "profile",
    headline: `Results-driven ${role}`,
    summaryHtml: sanitize(
      `<p>${`Experienced ${role.toLowerCase()} with a track record of measurable outcomes.`}</p>
       <ul>${top.map(k => `<li>${k}</li>`).join("")}</ul>`
    ),
  };
}

function fallbackForEmployment(job: any): AISuggestResponse {
  const verbs = ["Delivered", "Improved", "Automated", "Optimized", "Reduced", "Increased"];
  const objs =
    job?.keyResponsibilities ||
    job?.requirements ||
    job?.keywords ||
    [];
  const ks = bulletize(objs, 6);
  const bullets = [
    `${verbs[0]} ${ks[0] || "key feature"} resulting in measurable impact.`,
    `${verbs[1]} ${ks[1] || "process efficiency"} by 20% via data-driven iteration.`,
    `${verbs[2]} ${ks[2] || "reporting workflow"} to cut manual effort.`,
    `${verbs[3]} ${ks[3] || "query performance"} by refactoring hotspots.`,
  ].filter(Boolean);
  return { kind: "employment_bullets", bullets };
}

function fallbackForSkills(job: any): AISuggestResponse {
  const skills = bulletize(
    (job?.skills || job?.keywords || job?.requirements || []).map(String),
    8
  ).slice(0, 6);
  return { kind: "skills", items: skills.map((name) => ({ name })) };
}

function fallbackForLanguages(): AISuggestResponse {
  return { kind: "languages", items: [{ name: "English", level: "Fluent" }] };
}

function fallbackForHobbies(): AISuggestResponse {
  return { kind: "hobbies", items: ["Photography", "Trail running"] };
}

function fallbackForGeneric(section: CVSection): AISuggestResponse {
  const title = section?.title || "Section";
  return {
    kind: "generic_text",
    html: `<p>Suggested content for <strong>${sanitize(title)}</strong>.</p>`,
  };
}

function fallbackBySection(section: CVSection, job: any): AISuggestResponse {
  switch (section.key) {
    case "profile": return fallbackForProfile(job);
    case "employment": return fallbackForEmployment(job);
    case "skills": return fallbackForSkills(job);
    case "languages": return fallbackForLanguages();
    case "hobbies": return fallbackForHobbies();
    default: return fallbackForGeneric(section);
  }
}

// ---- Request handler ----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const section: CVSection | undefined = body?.section;
    const doc = body?.doc;
    const job = body?.job;

    if (!section || !section.key) {
      return NextResponse.json({ error: "Missing 'section' with a valid key." }, { status: 400 });
    }

    // Slim down what we ship to the LLM
    const sectionLite = {
      key: section.key,
      title: section.title,
      // Send only lightweight, human-readable bits
      description: section.description || "",
      recordsPreview: (section.records || []).slice(0, 3).map(r => ({
        key: r.key,
        valuesPreview: (r.values || []).map(v =>
          typeof v === "string" ? v.slice(0, 120) : v
        ),
      })),
    };

    const jobLite = pick(job, ["title", "role", "company", "location", "summary", "requirements", "responsibilities", "skills", "keywords", "seniority"]);

    // If we have an API key, try LLM first
    let suggestion: AISuggestResponse | null = null;

    if (process.env.OPENAI_API_KEY) {
      const sys =
        "You generate *one* JSON object with a single key 'suggestion' that matches the expected schema for the given CV section. " +
        "Do not include prose, only JSON. Target clarity, ATS-friendly wording, metrics, and action verbs.";

      const user =
        `SECTION (json-lite): ${JSON.stringify(sectionLite)}\n` +
        `JOB (json-lite): ${JSON.stringify(jobLite)}\n` +
        `DOC META: { sectionsCount: ${(doc?.sections?.length || 0)} }\n\n` +
        `Return strictly one JSON object like:\n` +
        `{"suggestion": { "kind": "profile", "headline": "...", "summaryHtml": "<p>...</p>" }}\n` +
        `or {"suggestion":{"kind":"employment_bullets","recordKey":"optional","bullets":["..."]}}\n` +
        `or {"suggestion":{"kind":"skills","items":[{"name":"...","level":"..."}]}}\n` +
        `or {"suggestion":{"kind":"languages","items":[{"name":"...","level":"..."}]}}\n` +
        `or {"suggestion":{"kind":"hobbies","items":["..."]}}\n` +
        `or {"suggestion":{"kind":"generic_text","html":"<p>...</p>"}}`;

      suggestion = await askLLM(sys, user);
    }

    // Fallback heuristics if no LLM or it failed
    if (!suggestion) {
      suggestion = fallbackBySection(section, job);
    }

    // Minimal safeguard
    if (suggestion.kind === "generic_text") {
      suggestion.html = sanitize(suggestion.html);
    } else if (suggestion.kind === "profile" && suggestion.summaryHtml) {
      suggestion.summaryHtml = sanitize(suggestion.summaryHtml);
    }

    return NextResponse.json({ suggestion }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
