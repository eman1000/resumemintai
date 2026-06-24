// lib/shortlist.ts
//
// AI candidate shortlisting: given a job description and a set of candidate
// resumes (plain text), rank the best matches with a score + honest, evidence-
// based reasons, and extract structured fields for the recruiter report.
// Grounded: it judges ONLY on what each resume actually says — it never invents
// qualifications, and it flags genuine gaps.
//
// candidateType tunes the criteria:
//   "experienced" → relevant work experience, skills, qualifications.
//   "intern"      → field-of-study relevance + academic results + potential;
//                   do NOT penalise a lack of professional experience.
//
// IMPORTANT: age and gender are extracted for the recruiter's report DISPLAY
// only — they MUST NOT influence the score. Gender is never inferred from a name.

import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL || "gpt-4o";

export type CandidateType = "experienced" | "intern";

export type ShortlistInput = { id: string; name: string; text: string };

export type ShortlistResult = {
  id: string;
  name: string;
  score: number; // 0–100 fit
  verdict: string; // one-line recommendation
  strengths: string[]; // resume-evidenced reasons they fit
  gaps: string[]; // requirements not evidenced in the resume
  // Structured fields (null when not stated on the resume).
  age: number | null;
  gender: string | null;
  yearsExperience: number | null;
  currentRole: string | null;
  qualification: string | null;
  certifications: string | null;
  education: string | null;
  academicResults: string | null;
};

function systemPrompt(type: CandidateType): string {
  const criteria =
    type === "intern"
      ? "These are STUDENTS / INTERNS (e.g. on industrial attachment). Rank primarily on: " +
        "relevance of their PROGRAM OF STUDY to the role, ACADEMIC RESULTS (distinctions / upper-seconds), " +
        "and demonstrated potential. Do NOT penalise a lack of professional work experience — it's expected."
      : "These are EXPERIENCED candidates. Rank primarily on: relevance and depth of WORK EXPERIENCE, " +
        "demonstrated SKILLS, QUALIFICATIONS, and professional certifications.";

  return (
    "You are an expert recruiter screening candidates for a role. You are given the JOB " +
    "DESCRIPTION and several CANDIDATES (each with an id, a fileName, and the raw text of " +
    "their resume). Rank how well each candidate fits the job.\n\n" +
    criteria +
    "\n\nHONESTY (critical): judge ONLY on what the resume actually states. Never assume or " +
    "invent skills, seniority, or experience a candidate hasn't written. If a key requirement " +
    "isn't evidenced, list it as a gap and lower the score. Cite concrete evidence in strengths.\n\n" +
    "FAIRNESS (critical): age and gender MUST NOT affect the score in any way. Extract them ONLY " +
    "if explicitly stated on the resume, purely for the recruiter's records. NEVER infer gender " +
    "from a name or photo; if not explicitly stated, return null.\n\n" +
    "For EACH candidate also extract (null if not stated):\n" +
    "- name: full name from the resume\n" +
    "- age: number, only if explicitly stated\n" +
    "- gender: only if explicitly stated\n" +
    "- yearsExperience: total years of professional experience (integer; null for students with none)\n" +
    "- currentRole: most recent job title\n" +
    "- qualification: highest qualification / degree (e.g. 'BCom Accounting')\n" +
    "- certifications: professional training / certs (e.g. 'CIMA, ACCA'); null if none\n" +
    "- education: university / college + program of study\n" +
    "- academicResults: e.g. '10 Distinctions, 5 x 2:1' if present (mainly students); else null\n\n" +
    'Return STRICT JSON: { "candidates": [ { "id": string, "name": string|null, "age": number|null, ' +
    '"gender": string|null, "yearsExperience": number|null, "currentRole": string|null, ' +
    '"qualification": string|null, "certifications": string|null, "education": string|null, ' +
    '"academicResults": string|null, "score": number (0-100), "verdict": string (one concise line), ' +
    '"strengths": string[] (2-4, each citing resume evidence), "gaps": string[] (0-4 missing/weak) } ] }. ' +
    "Include EVERY candidate. Sort by score descending. Be discerning — spread scores; do not cluster at the top."
  );
}

const strList = (v: any): string[] =>
  (Array.isArray(v) ? v : []).map((s: any) => String(s || "").trim()).filter(Boolean);

const numOrNull = (v: any): number | null => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const strOrNull = (v: any): string | null => {
  const s = String(v ?? "").trim();
  return s && s.toLowerCase() !== "null" ? s : null;
};

export async function shortlistCandidates(
  jdText: string,
  candidates: ShortlistInput[],
  opts?: { candidateType?: CandidateType },
): Promise<ShortlistResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("not_configured");
  if (!candidates.length) return [];

  const type: CandidateType = opts?.candidateType === "intern" ? "intern" : "experienced";
  const nameById = new Map(candidates.map((c) => [c.id, c.name]));
  const user = JSON.stringify({
    jobDescription: String(jdText || "").slice(0, 8000),
    candidates: candidates.map((c) => ({ id: c.id, fileName: c.name, resume: c.text.slice(0, 6000) })),
  }).slice(0, 110_000);

  const client = new OpenAI({ apiKey });
  const resp = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt(type) },
      { role: "user", content: user },
    ],
  });

  const parsed = JSON.parse(resp.choices?.[0]?.message?.content || "{}");
  const rows: any[] = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  return rows
    .map((r) => {
      const llmName = String(r.name || "").trim();
      const fileName = nameById.get(String(r.id || "")) || "";
      return {
        id: String(r.id || ""),
        name: llmName || fileName || "Candidate",
        score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
        verdict: String(r.verdict || "").trim(),
        strengths: strList(r.strengths),
        gaps: strList(r.gaps),
        age: numOrNull(r.age),
        gender: strOrNull(r.gender),
        yearsExperience: numOrNull(r.yearsExperience),
        currentRole: strOrNull(r.currentRole),
        qualification: strOrNull(r.qualification),
        certifications: strOrNull(r.certifications),
        education: strOrNull(r.education),
        academicResults: strOrNull(r.academicResults),
      };
    })
    .filter((r) => nameById.has(r.id))
    .sort((a, b) => b.score - a.score);
}
