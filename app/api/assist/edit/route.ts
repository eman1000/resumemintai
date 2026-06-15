// app/api/assist/edit/route.ts
//
// Conversational editing for a resume or cover letter. The user types a plain
// instruction ("make it shorter", "remove the PHP skill", "punchier opening")
// and we return the edited document in the SAME shape. Honest: for resumes it
// may only reword/trim/remove/reorder existing content — never invent skills or
// experience the resume doesn't already contain.

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from "@/lib/aiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL || "gpt-4o";

export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const dbUser = await prisma.user.findUnique({ where: { firebaseUid: fb.uid }, select: { id: true } });
    if (!dbUser?.id) return NextResponse.json({ error: "no_user" }, { status: 403 });

    const quota = await checkAiUsage(dbUser.id, "ats-optimize");
    if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

    const body = await req.json().catch(() => ({}));
    const kind = body?.kind === "coverLetter" ? "coverLetter" : "resume";
    const data = body?.data;
    const instruction = String(body?.instruction || "").trim();
    if (!data || typeof data !== "object") return NextResponse.json({ error: "missing_data" }, { status: 400 });
    if (!instruction) return NextResponse.json({ error: "missing_instruction" }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });

    const system =
      kind === "coverLetter"
        ? "You edit a cover letter per the user's instruction. The input JSON has " +
          "{ subject, salutation, paragraphs[], closing, signatureName, sender, recipient, ... }. " +
          "Apply the instruction (e.g. shorter, punchier, different tone, fix a line). Keep it honest — " +
          "do NOT invent achievements or skills the candidate didn't state. Keep it to ~3 short paragraphs " +
          "so it fits one page unless told otherwise. Return the FULL JSON object with the SAME keys, only " +
          "the edited fields changed. JSON only."
        : "You edit a resume per the user's instruction. The input JSON is { sections: CVSection[] } where " +
          "each section has { key, title, fields, records } and each record has a `values` array (positional). " +
          "Apply the instruction (e.g. make it shorter, remove a skill, reword a bullet, reorder). " +
          "CRITICAL HONESTY: you may only reword, trim, remove, or reorder content that is ALREADY there — " +
          "NEVER add a skill, tool, employer, date, or achievement the resume doesn't contain. Keep the EXACT " +
          "shape: same section keys, same field definitions, same record `values` array positions (edit the " +
          "strings in place; to remove an item drop its whole record). Return the FULL { sections } JSON only.";

    const user = JSON.stringify({ instruction, data }).slice(0, 100_000);

    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    await recordAiUsage(dbUser.id, "ats-optimize");

    const parsed = JSON.parse(resp.choices?.[0]?.message?.content || "{}");
    // Normalize: resume expects { sections }, cover letter expects the doc object.
    let out = parsed;
    if (kind === "resume") {
      const sections = Array.isArray(parsed?.sections) ? parsed.sections : Array.isArray(parsed) ? parsed : null;
      if (!sections) return NextResponse.json({ error: "bad_edit" }, { status: 502 });
      out = { ...data, sections };
    } else {
      // Merge edited fields back onto the original doc (preserve untouched keys).
      out = { ...data, ...parsed };
    }
    return NextResponse.json({ data: out });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[POST /api/assist/edit]", e);
    return NextResponse.json({ error: "edit_failed", detail: e?.message }, { status: 500 });
  }
}
