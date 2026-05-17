import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CVSectionKey } from "@/app/api/lib/parse"; // adjust path if needed
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from "@/lib/aiUsage";

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

// Premium route — uses OPENAI_MODEL_PREMIUM (default gpt-4o).
const MODEL = process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL || "gpt-4o";

export async function POST(req: NextRequest) {
  try {
    // Auth required so we can meter usage. Anonymous callers can no longer
    // burn through tokens here.
    let userId: string | null = null;
    try {
      const u = await getUserFromRequest();
      const row = await prisma.user.findUnique({
        where: { firebaseUid: u.uid },
        select: { id: true },
      });
      userId = row?.id ?? null;
    } catch {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!userId) return NextResponse.json({ error: "no_user" }, { status: 403 });

    const quota = await checkAiUsage(userId, "ats-optimize");
    if (!quota.ok) {
      return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });
    }

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
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const out: OptimizeOut = JSON.parse(resp.choices[0].message.content || "{}");
    await recordAiUsage(userId, "ats-optimize");
    return NextResponse.json({
      ...out,
      quota: {
        feature: quota.feature,
        remainingDay: Math.max(0, quota.remainingDay - 1),
        remainingMonth: Math.max(0, quota.remainingMonth - 1),
        dayLimit: quota.dayLimit,
        monthLimit: quota.monthLimit,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
