// app/api/import-linkedin/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { mapOutToSections } from "../lib/parse";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { json, url } = body || {};

    if (!json && !url) {
      return NextResponse.json({ error: "Provide LinkedIn JSON or URL" }, { status: 400 });
    }

    let text = "";
    if (json) {
      text = JSON.stringify(json);
    } else if (url) {
      // You can swap this for your own scraper / server-side fetcher
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return NextResponse.json({ error: "Unable to fetch URL" }, { status: 422 });
      const html = await res.text();
      // crude HTML→text; you may replace with a better extractor
      text = html.replace(/<script[\s\S]*?<\/script>/gi, "")
                 .replace(/<style[\s\S]*?<\/style>/gi, "")
                 .replace(/<[^>]+>/g, " ")
                 .replace(/\s+/g, " ")
                 .trim();
    }

    if (!text) return NextResponse.json({ error: "No content to parse" }, { status: 422 });

    const sections = await structureWithOpenAI(text);
    return NextResponse.json({ sections });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
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
