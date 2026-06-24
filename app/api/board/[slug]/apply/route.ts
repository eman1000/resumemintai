// app/api/board/[slug]/apply/route.ts
//
// A signed-in candidate applies to an internal posting with one of their
// resumes. We freeze the resume's plain text on the application so the recruiter
// can AI-shortlist applicants later without re-rendering. One application per
// candidate per posting (idempotent upsert).
//
// Body: { resumeId, name?, email?, coverLetterId?, note? }

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import { resumeToPlainText } from "@/lib/resumeText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const fb = await getUserFromRequest();
    const user = await prisma.user.findUnique({ where: { firebaseUid: fb.uid }, select: { id: true } });
    if (!user?.id) return NextResponse.json({ error: "no_user" }, { status: 403 });

    const job = await prisma.jobPosting.findUnique({ where: { slug: params.slug }, select: { id: true, status: true, recruiterId: true } });
    if (!job || job.status !== "open") return NextResponse.json({ error: "not_open" }, { status: 404 });
    if (job.recruiterId === user.id) return NextResponse.json({ error: "own_posting" }, { status: 400 });

    const b = (await req.json().catch(() => ({}))) as any;
    const resumeId = String(b.resumeId || "");
    if (!resumeId) return NextResponse.json({ error: "missing_resume" }, { status: 400 });

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      select: { id: true, data: true },
    });
    if (!resume) return NextResponse.json({ error: "resume_not_found" }, { status: 404 });

    const resumeText = resumeToPlainText(resume.data);
    const applicantName = (typeof b.name === "string" && b.name.trim()) || fb.email?.split("@")[0] || "Candidate";
    const applicantEmail = (typeof b.email === "string" && b.email.trim()) || fb.email || null;
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 2000) : null;
    const coverLetterId = typeof b.coverLetterId === "string" && b.coverLetterId ? b.coverLetterId : null;

    const app = await prisma.jobApplication.upsert({
      where: { jobPostingId_applicantId: { jobPostingId: job.id, applicantId: user.id } },
      create: {
        jobPostingId: job.id,
        applicantId: user.id,
        resumeId,
        coverLetterId,
        resumeText,
        applicantName: applicantName.slice(0, 120),
        applicantEmail: applicantEmail ? applicantEmail.slice(0, 200) : null,
        note,
        status: "submitted",
      },
      update: {
        resumeId,
        coverLetterId,
        resumeText,
        applicantName: applicantName.slice(0, 120),
        applicantEmail: applicantEmail ? applicantEmail.slice(0, 200) : null,
        note,
        status: "submitted",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, applicationId: app.id });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED" || e?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/board/[slug]/apply]", e);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 });
  }
}
