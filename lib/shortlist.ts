// lib/shortlist.ts
//
// AI candidate shortlisting: given a job description and a set of candidate
// resumes (plain text), rank the best matches with a score + honest, evidence-
// based reasons. Grounded: it judges ONLY on what each resume actually says —
// it never invents qualifications, and it flags genuine gaps.

import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL || "gpt-4o";

export type ShortlistInput = { id: string; name: string; text: string };

export type ShortlistResult = {
  id: string;
  name: string;
  score: number; // 0–100 fit
  verdict: string; // one-line recommendation
  strengths: string[]; // resume-evidenced reasons they fit
  gaps: string[]; // requirements not evidenced in the resume
};

const SYSTEM =
  "You are an expert technical recruiter screening candidates for a role. You are " +
  "given the JOB DESCRIPTION and several CANDIDATES (each with an id, a fileName, and " +
  "the raw text of their resume). Rank how well each candidate fits the job.\n\n" +
  "HONESTY (critical): judge ONLY on what the resume actually states. Never assume " +
  "or invent skills, seniority, or experience a candidate hasn't written. If a key " +
  "requirement isn't evidenced, list it as a gap and lower the score — do not give " +
  "the benefit of the doubt. Cite concrete evidence from the resume in strengths.\n\n" +
  "Also read the candidate's FULL NAME from the resume text (usually at the top). If " +
  "no name is present, use null.\n\n" +
  'Return STRICT JSON: { "candidates": [ { "id": string, "name": string|null (the ' +
  "person's full name from the resume), \"score\": number (0-100), " +
  '"verdict": string (one concise line), "strengths": string[] (2-4, each citing ' +
  'resume evidence), "gaps": string[] (0-4 missing/weak requirements) } ] }. ' +
  "Include EVERY candidate. Sort by score descending. Be discerning — spread scores; " +
  "do not cluster everyone at the top.";

export async function shortlistCandidates(
  jdText: string,
  candidates: ShortlistInput[],
): Promise<ShortlistResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("not_configured");
  if (!candidates.length) return [];

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
      { role: "system", content: SYSTEM },
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
      // Prefer the real name the LLM read off the resume; fall back to the
      // (filename-derived) name we were given.
      name: llmName || fileName || "Candidate",
      score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
      verdict: String(r.verdict || "").trim(),
      strengths: (Array.isArray(r.strengths) ? r.strengths : []).map((s: any) => String(s || "").trim()).filter(Boolean),
      gaps: (Array.isArray(r.gaps) ? r.gaps : []).map((s: any) => String(s || "").trim()).filter(Boolean),
      };
    })
    .filter((r) => nameById.has(r.id))
    .sort((a, b) => b.score - a.score);
}
