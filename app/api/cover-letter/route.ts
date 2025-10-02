import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai, OPENAI_MODEL } from "@/lib/openai";

const Body = z.object({
  summary: z.string().min(10),
  jobDescription: z.string().min(10),
  tone: z.enum(["professional", "friendly", "impactful", "concise"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());

    const sys = `You write tight, modern cover letters.
- 150-220 words max.
- 1 paragraph + a 3-bullet highlight list.
- Mirror the target company's language.
- Avoid clichés, keep it specific, quantifiable, and skimmable.
Return plain text only.`;

    const user = `CANDIDATE_SUMMARY:\n${body.summary}\n\nJOB_DESCRIPTION:\n${body.jobDescription}\n\nTone: ${body.tone ?? "professional"}`;

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.5,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ letter: text.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 400 });
  }
}
