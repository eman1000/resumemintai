import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type JDOut = {
  role?: string;
  seniority?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  responsibilities?: string[];
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
  keywords?: string[];          // screening terms/ATS tokens
  tools?: string[];             // e.g., Jira, Salesforce
  metricsLanguage?: string[];   // verbs & KPIs to echo in bullets
};

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing JD text" }, { status: 400 });
    }

    const system = `
You analyze job descriptions for resume tailoring. Return ONLY valid JSON:

type Out = {
  role?: string;
  seniority?: string;
  company?: string;
  location?: string;
  employmentType?: string;
  responsibilities?: string[];
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
  keywords?: string[];
  tools?: string[];
  metricsLanguage?: string[];
};
Rules:
- "keywords" should include exact tokens/phrases likely used in ATS searches.
- Keep items atomic ("React", not "React/Angular").
- No commentary. JSON only.
`.trim();

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: text.slice(0, 60_000) },
      ],
    });

    const out: JDOut = JSON.parse(resp.choices[0].message.content || "{}");
    return NextResponse.json({ job: out });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
