import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CVSectionKey } from "@/app/api/lib/parse"; // adjust path if needed

interface CVField { key: string; role: string; fieldType?: string }
interface CVRecord { key: string; values: any[] }
interface CVSection { key: CVSectionKey; title: string; fields: CVField[]; records: CVRecord[]; description?: string }

type OptimizeOut = {
  sections: CVSection[]; // same structure, updated bullets/headlines where helpful
  tailoredBullets: Array<{
    sectionKey: CVSectionKey;
    recordKey: string;
    bullets: string[];
  }>;
  coverage: {
    mustHaveCovered: string[];
    mustHaveMissing: string[];
    niceToHaveCovered: string[];
    niceToHaveMissing: string[];
    keywordsCovered: string[];
    keywordsMissing: string[];
  };
  atsChecklist: string[]; // UI tips you can show to the user
};

export const runtime = "nodejs";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { sections, job } = await req.json();
    if (!Array.isArray(sections) || !job) {
      return NextResponse.json({ error: "Missing { sections, job }" }, { status: 400 });
    }

    const system = `
You tailor resumes for ATS. Input: { sections: CVSection[], job: JDOut }.
Output ONLY valid JSON matching:

type Out = {
  sections: CVSection[];
  tailoredBullets: Array<{ sectionKey: CVSectionKey; recordKey: string; bullets: string[] }>;
  coverage: {
    mustHaveCovered: string[]; mustHaveMissing: string[];
    niceToHaveCovered: string[]; niceToHaveMissing: string[];
    keywordsCovered: string[]; keywordsMissing: string[];
  };
  atsChecklist: string[];
};

Rules:
- Keep the same CVSection shape (keys, fields, records). DO NOT invent new roles/field keys.
- Improve clarity, add metrics ("increased X by Y%"), but DO NOT fabricate facts. If unsure, propose neutral wording.
- Prefer short, scannable bullets (<= 2 lines each).
- Echo JD tokens when accurate, but avoid keyword stuffing.
- Preserve dates and employers; reorder bullets to emphasize JD-aligned impact.
- NEVER add tables, images, shapes, text boxes, or multi-column hacks.
`.trim();

    const user = JSON.stringify({ sections, job }).slice(0, 90_000);

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const out: OptimizeOut = JSON.parse(resp.choices[0].message.content || "{}");
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
