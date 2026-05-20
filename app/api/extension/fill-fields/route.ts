// app/api/extension/fill-fields/route.ts
//
// Given a batch of form fields scraped from a job application page and the
// user's flat resume, ask gpt-4o-mini to suggest a value for each field.
// Returns { values: { fieldId: value } } — content-script applies them.

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";
import prisma from "@/lib/prisma";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from "@/lib/aiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type AiField = {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
  options?: string[];
};

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const quota = await checkAiUsage(userId, "extension-fill");
  if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const fields: AiField[] = Array.isArray(body?.fields) ? body.fields.slice(0, 80) : [];
  const resume = body?.resume;
  const pageContext = body?.pageContext || {};

  if (fields.length === 0 || !resume) {
    return NextResponse.json({ error: "missing_input" }, { status: 400 });
  }

  const system = `You map fields on a job application form to values from a candidate's resume.

Rules:
- Output ONLY a JSON object of the shape: { "values": { "<fieldId>": "<string value>", ... } }.
- Only include fields you have a confident, truthful value for. Skip the rest.
- Do NOT invent facts not in the resume.
- For names: use the resume's fullName / firstName / lastName as appropriate.
- For phone/email/links: pass the exact value from the resume.
- For select fields: pick the option that best matches; if none fits, omit.
- For "yes/no" eligibility (e.g. "Are you authorized to work?"), omit — the user must answer.
- Keep values short and form-friendly. No markdown.`;

  const user = JSON.stringify({ pageContext, resume, fields }).slice(0, 60_000);

  let aiOut: any = {};
  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    aiOut = JSON.parse(resp.choices[0].message.content || "{}");
  } catch (e: any) {
    console.error("[extension/fill-fields] AI error", e?.message);
    return NextResponse.json({ error: "ai_failed", detail: e?.message }, { status: 502 });
  }

  await recordAiUsage(userId, "extension-fill");

  const values = (aiOut?.values && typeof aiOut.values === "object") ? aiOut.values : {};
  return NextResponse.json({
    values,
    quota: {
      remainingDay: Math.max(0, quota.remainingDay - 1),
      remainingMonth: Math.max(0, quota.remainingMonth - 1),
    },
  });
}
