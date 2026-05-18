// app/api/import-linkedin/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { mapOutToSections } from "../lib/parse";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { json, text: pastedText } = body || {};

    let text = "";
    if (typeof pastedText === "string" && pastedText.trim().length > 0) {
      text = pastedText.trim();
    } else if (json) {
      text = typeof json === "string" ? json : JSON.stringify(json);
    } else {
      // We deliberately removed URL fetching: LinkedIn redirects unauthenticated
      // requests to /authwall, so the prior flow only ever fed GPT a login page.
      return NextResponse.json(
        {
          error: "missing_input",
          detail:
            "Paste your LinkedIn profile text. URL fetching no longer works because LinkedIn blocks unauthenticated requests.",
        },
        { status: 400 },
      );
    }

    if (text.length < 200) {
      return NextResponse.json(
        { error: "too_short", detail: "Paste more of your profile so the AI has enough to work with." },
        { status: 422 },
      );
    }

    const sections = await structureWithOpenAI(text);
    return NextResponse.json({ sections });
  } catch (e: any) {
    console.error("[POST /api/import-linkedin]", e);
    return NextResponse.json({ error: "import_failed", detail: e?.message || String(e) }, { status: 500 });
  }
}

async function structureWithOpenAI(text: string) {
  const system = `
You are a resume parser. Return JSON ONLY, matching:

type Out = {
  personalDetails?: {
    fullName?: string; headline?: string; email?: string; phone?: string;
    location?: string[]; websites?: string[]; socials?: {network:string,url:string}[];
  };
  profile?: { headline?: string; summary?: string };
  employment?: Array<{ role?: string; company?: string; location?: string;
    period?: [string,string] | string; bullets?: string[] }>;
  educations?: Array<{ degree?: string; school?: string; location?: string;
    period?: [string,string] | string; details?: string[] }>;
  skills?: string[];
  languages?: string[];
  certifications?: Array<{ name?: string; org?: string; period?: [string,string] | string }>;
  courses?: string[];
  projects?: Array<{ name?: string; role?: string; period?: [string,string] | string; bullets?: string[] }>;
  publications?: Array<{ title?: string; publisher?: string; date?: string }>;
  volunteer?: Array<{ role?: string; org?: string; period?: [string,string] | string; bullets?: string[] }>;
  honors?: string[];
  sideActivities?: Array<{ header?: string; period?: [string,string] | string; bullets?: string[] }>;
  achievements?: string[];
  references?: string[];
  footerNote?: string;
};
Rules:
- Infer conservatively. Prefer arrays for bullets.
- "skills" MUST be an array of atomic skills (["React","TypeScript","Node.js"]). Split categories like "Frontend: React, Angular · Backend: Node".
- Prefer [start,end]; if unknown end, use "Present".
- No commentary. JSON only.
`.trim();

  const user = ["LINKEDIN_INPUT_START", String(text).slice(0, 100_000), "LINKEDIN_INPUT_END"].join("\n");

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = resp.choices?.[0]?.message?.content || "{}";
  let out: any;
  try { out = JSON.parse(content); } catch { out = {}; }

  return mapOutToSections(out);
}
