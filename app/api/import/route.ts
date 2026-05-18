// app/api/import/route.ts
import { NextRequest, NextResponse } from "next/server";

// If you already have your own extractors, reuse them.
// (pdf-parse for PDFs, mammoth for DOCX, etc.)
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

// npm i openai
import OpenAI from "openai";
import { CVSectionKey, escapeHtml, mapOutToSections, normalizeSkills } from "../lib/parse";


interface CVField { key: string; role: string; fieldType?: string }
interface CVRecord { key: string; values: any[] }
interface CVSection { key: CVSectionKey; title: string; fields: CVField[]; records: CVRecord[]; description?: string }

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const runtime = "nodejs"; // ensure server runtime

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let text = '';

    if (contentType.includes('application/json')) {
      // JSON text payload — used by the /resume-checker → /builder handoff
      // where the text was already extracted client-side.
      const body = await req.json().catch(() => null) as any;
      text = String(body?.text || '').trim().slice(0, 100_000);
      if (!text) {
        return NextResponse.json({ error: "Missing text." }, { status: 400 });
      }
    } else {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      const formText = form.get("text");
      if (typeof formText === 'string' && formText.trim()) {
        text = formText.trim().slice(0, 100_000);
      } else if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const lower = (file.name || "").toLowerCase();
        if (lower.endsWith(".pdf") || file.type === "application/pdf") {
          const parsed = await pdfParse(buf);
          text = (parsed.text || "").trim();
        } else if (
          lower.endsWith(".docx") ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const res = await mammoth.extractRawText({ buffer: buf });
          text = (res.value || "").trim();
        } else {
          return NextResponse.json({ error: "Unsupported file. Upload PDF or DOCX." }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "No file or text." }, { status: 400 });
      }
    }
    if (!text) {
      return NextResponse.json({ error: "No extractable text (scanned or empty)." }, { status: 422 });
    }

    // Try OpenAI structuring
    let sections: CVSection[] | null = null;
    try {
      sections = await structureWithOpenAI(text);
    } catch (e) {
      // fall back to simple heuristics
      sections = heuristicStructure(text);
    }

    return NextResponse.json({ sections });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

/** Ask OpenAI to convert raw resume text → normalized sections */
async function structureWithOpenAI(text: string): Promise<CVSection[]> {
  // Keep the schema compact; we’ll map to your CVSection shape directly.
  const system = `
You are a resume parser. Return JSON ONLY, matching this TypeScript:

type Out = {
  personalDetails?: {
    fullName?: string; headline?: string; email?: string; phone?: string; location?: string[];
  };
  profile?: { headline?: string; summary?: string };
  employment?: Array<{ role?: string; company?: string; period?: [string, string] | string; bullets?: string[] }>;
  educations?: Array<{ degree?: string; school?: string; period?: [string, string] | string; details?: string[] }>;
  skills?: string[];
  languages?: string[];
  hobbies?: string[];
  qualities?: string[];
  courses?: string[];
  certificates?: string[];
  internships?: Array<{ role?: string; org?: string; period?: [string,string] | string; bullets?: string[] }>;
  sideActivities?: Array<{ header?: string; period?: [string,string] | string; bullets?: string[] }>;
  achievements?: string[];
  references?: string[];
  footerNote?: string;
};
Rules:
- Infer missing fields conservatively.
- Prefer arrays for bullets.
- For "skills", ALWAYS return a valid string array of atomic skills (e.g., ["React", "TypeScript", "Node.js"]), If the source has category blocks like "Frontend: React, Angular · Backend: Node", split them.
- Prefer [start,end] for periods; if unknown end, use "Present".
- No extra commentary. JSON only.
  `.trim();

  const user = [
    "RAW_RESUME_TEXT_START",
    text.slice(0, 100_000), // cap long files
    "RAW_RESUME_TEXT_END"
  ].join("\n");

  // JSON-mode style response
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
  });

  const json = JSON.parse(resp.choices[0].message.content || "{}");
  return mapOutToSections(json);
}

/** Heuristic backup splitter for when the LLM fails or is disabled */
function heuristicStructure(raw: string): CVSection[] {
  const text = raw.replace(/\r/g, "");
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean);

  const blocks: Record<string, string[]> = {
    profile: [],
    employment: [],
    educations: [],
    skills: [],
    languages: [],
  };

  // super basic bucket by heading tokens
  let current = "profile";
  for (const line of lines) {
    const l = line.toLowerCase();
    if (/^(experience|employment|work history)\b/.test(l)) { current = "employment"; continue; }
    if (/^(education|studies|academics)\b/.test(l)) { current = "educations"; continue; }
    if (/^(skills|technical skills)\b/.test(l)) { current = "skills"; continue; }
    if (/^languages?\b/.test(l)) { current = "languages"; continue; }
    blocks[current]?.push(line);
  }

  const sections: CVSection[] = [
    {
      key: "profile",
      title: "Profile",
      fields: [{ key: "v", role: "richtextValue" }],
      records: [{ key: "p1", values: [blocks.profile.join("\n")] }],
    },
    {
      key: "employment",
      title: "Employment",
      fields: [{ key: "h", role: "header" }, { key: "sub", role: "subheader" }, { key: "per", role: "period" }, { key: "rich", role: "richtextValue" }],
      records: blocks.employment.length ? [{
        key: "e1",
        values: [
          blocks.employment[0] || "",
          blocks.employment[1] || "",
          ["", ""],
          "<ul>" + blocks.employment.slice(2, 8).map(li => `<li>${escapeHtml(li)}</li>`).join("") + "</ul>"
        ],
      }] : [],
    },
    {
      key: "educations",
      title: "Education",
      fields: [{ key: "h", role: "header" }, { key: "sub", role: "subheader" }, { key: "per", role: "period" }],
      records: blocks.educations.length ? [{
        key: "ed1",
        values: [blocks.educations[0] || "", blocks.educations[1] || "", ["",""]],
      }] : [],
    },
    {
      key: "skills",
      title: "Skills",
      fields: [{ key: "h", role: "header" }],
      records: (() => {
        const items = normalizeSkills(blocks.skills.join(" · "));
        return items.length ? [{ key: "s1", values: [items.join(" · ")] }] : [];
      })(),
    },
    {
      key: "languages",
      title: "Languages",
      fields: [{ key: "h", role: "header" }],
      records: blocks.languages.length ? [{ key: "l1", values: [blocks.languages.join(", ")] }] : [],
    },
  ];

  return sections;
}





