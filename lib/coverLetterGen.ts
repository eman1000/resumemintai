// lib/coverLetterGen.ts
//
// Generate a cover letter that is GROUNDED in the candidate's resume. It may use
// only resume-evidenced experience + skills the user has explicitly confirmed —
// never invented skills, even if the job asks for them. Shared by the web
// (/api/jobs/cover-letter) and extension (/api/extension/cover-letter) routes.

import OpenAI from "openai";
import { toJsonResume } from "@/lib/jsonResume";

const MODEL = process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL || "gpt-4o";

export type CoverLetterDoc = {
  id: string;
  sender: { fullName: string; email: string; phone: string; address: string; city: string; linkedIn?: string };
  recipient: { name: string; title: string; company: string; address: string; city: string };
  date: string;
  subject: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  signatureName: string;
};

export type GenCoverArgs = {
  resumeData: any;
  job?: { title?: string; company?: string; description?: string; jdText?: string; keywords?: string[] } | null;
  confirmedSkills?: string[];
  senderEmailFallback?: string;
};

function resumeSummary(jr: any): string {
  const lines: string[] = [];
  if (jr.basics?.summary) lines.push("Summary: " + jr.basics.summary);
  for (const w of jr.work || []) {
    lines.push(`- ${[w.position, w.name].filter(Boolean).join(" at ")}: ${(w.highlights || []).join("; ")}`);
  }
  for (const p of jr.projects || []) {
    lines.push(`- Project ${p.name}: ${(p.highlights || []).join("; ")}`);
  }
  const skills = (jr.skills || [])
    .map((s: any) => ((s.keywords || []).length ? `${s.name}: ${(s.keywords || []).join(", ")}` : s.name))
    .filter(Boolean)
    .join(" | ");
  if (skills) lines.push("Skills: " + skills);
  return lines.join("\n").slice(0, 6000);
}

/** Generate a grounded cover-letter document from a resume + job. */
export async function generateCoverLetterDoc(args: GenCoverArgs): Promise<CoverLetterDoc> {
  const jr: any = toJsonResume(args.resumeData || {});
  const summary = resumeSummary(jr);
  const j: any = args.job || {};
  const jd = [
    j.description, j.jdText,
    Array.isArray(j.responsibilities) ? "Responsibilities: " + j.responsibilities.join("; ") : "",
    Array.isArray(j.keywords) ? "Keywords: " + j.keywords.join(", ") : "",
  ].filter(Boolean).join("\n").slice(0, 6000);
  const title = String(args.job?.title || "").trim();
  const company = String(args.job?.company || "").trim();
  const confirmed = (args.confirmedSkills || []).map((s) => String(s || "").trim()).filter(Boolean);

  const sender = {
    fullName: jr.basics?.name || "",
    email: jr.basics?.email || args.senderEmailFallback || "",
    phone: jr.basics?.phone || "",
    address: jr.basics?.location?.address || "",
    city: jr.basics?.location?.city || "",
  };

  let subject =
    title && company ? `Application for ${title} at ${company}` : title ? `Application for ${title}` : "Job Application";
  let paragraphs: string[] = [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && (summary || jd)) {
    const system =
      "You write concise, HONEST cover letters grounded strictly in the candidate's resume.\n" +
      "HONESTY (critical): only reference skills, tools, and experience present in the RESUME " +
      "SUMMARY or in CONFIRMED SKILLS. NEVER claim a skill/tool/achievement not evidenced there, " +
      "even if the job requires it. No fabricated metrics or facts. No clichés, no 'I am writing to apply'.\n" +
      'Return JSON only: { "subject": string, "paragraphs": string[] } — 3–4 paragraphs, 50–90 words each. ' +
      "Open with a concrete hook naming the role + company; close action-oriented. Do NOT put the candidate's " +
      "email/phone in the body.";
    const userPrompt = [
      `ROLE: ${title || "(unspecified)"}`,
      `COMPANY: ${company || "(unspecified)"}`,
      `JOB DESCRIPTION:\n${jd || "(not provided — keep it general but still grounded in the resume)"}`,
      `CONFIRMED SKILLS (the candidate confirmed they have these): ${confirmed.join(", ") || "(none)"}`,
      `RESUME SUMMARY (the ONLY source of truth for experience):\n${summary || "(sparse)"}`,
    ].join("\n\n");
    try {
      const client = new OpenAI({ apiKey });
      const r = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      });
      const parsed = JSON.parse(r.choices[0]?.message?.content || "{}");
      if (parsed.subject) subject = String(parsed.subject);
      if (Array.isArray(parsed.paragraphs)) paragraphs = parsed.paragraphs.map((p: any) => String(p || "").trim()).filter(Boolean);
    } catch {
      /* fall through to a safe default */
    }
  }

  if (!paragraphs.length) {
    paragraphs = [
      `I'm excited to apply for the ${title || "role"}${company ? ` at ${company}` : ""}.`,
      `My background${jr.work?.[0]?.position ? ` as ${jr.work[0].position}` : ""} maps closely to what this role needs, and I'd bring that experience from day one.`,
      `I'd welcome the chance to discuss how I can contribute to your team.`,
    ];
  }

  return {
    id: "local",
    sender,
    recipient: { name: "Hiring Manager", title: "", company, address: "", city: "" },
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    subject,
    salutation: "Dear Hiring Manager,",
    paragraphs,
    closing: "Sincerely,",
    signatureName: sender.fullName,
  };
}

/** The cover-letter body as plain text (for filling a form's cover-letter field). */
export function coverLetterToText(doc: CoverLetterDoc): string {
  return [doc.salutation, "", ...doc.paragraphs, "", doc.closing, doc.signatureName].filter((l) => l !== undefined).join("\n");
}
