// app/api/jobs/cover-letter/route.ts
//
// Generate a cover letter for a job, grounded in a resume, and save it as a
// CoverLetter row linked to that resume. Used after tailoring (auto cover letter)
// and from the cover-letter editor's "generate from job".

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from "@/lib/aiUsage";
import { generateCoverLetterDoc } from "@/lib/coverLetterGen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const dbUser = await prisma.user.findUnique({ where: { firebaseUid: fb.uid }, select: { id: true, email: true } });
    if (!dbUser?.id) return NextResponse.json({ error: "no_user" }, { status: 403 });
    const userId = dbUser.id;

    const quota = await checkAiUsage(userId, "cover-letter-tailor");
    if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

    const body = await req.json().catch(() => ({}));
    const resumeId = String(body?.resumeId || "");
    if (!resumeId) return NextResponse.json({ error: "missing_resumeId" }, { status: 400 });

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true, data: true, language: true, renderer: true },
    });
    if (!resume) return NextResponse.json({ error: "resume_not_found" }, { status: 404 });

    const job = body?.job || null;
    const confirmedSkills: string[] = Array.isArray(body?.confirmedSkills) ? body.confirmedSkills : [];

    const doc = await generateCoverLetterDoc({
      resumeData: resume.data,
      job,
      confirmedSkills,
      senderEmailFallback: dbUser.email || "",
    });
    await recordAiUsage(userId, "cover-letter-tailor");

    const title = `Cover Letter${job?.company ? ` — ${job.company}` : job?.title ? ` — ${job.title}` : ""}`;
    const tailoredForJob = job
      ? { source: "auto_tailor", title: job.title || "", company: job.company || "", location: job.location || "" }
      : undefined;

    const created = await prisma.coverLetter.create({
      data: {
        userId,
        resumeId: resume.id,
        title: title.slice(0, 200),
        renderer: "professional",
        data: doc as any,
        language: resume.language || undefined,
        ...(tailoredForJob ? { tailoredForJob: tailoredForJob as any } : {}),
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id, data: doc });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[POST /api/jobs/cover-letter]", e);
    return NextResponse.json({ error: "cover_letter_failed", detail: e?.message }, { status: 500 });
  }
}
