// app/api/recruiter/applications/[id]/resume/route.ts
// Render an applicant's resume as a PDF for the recruiter who owns the posting.
// Lets recruiters view/download a board applicant's resume from the shortlist.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";
import { renderResumeThemedPdf } from "@/lib/resumeThemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();

    const app = await prisma.jobApplication.findUnique({
      where: { id: params.id },
      select: { resumeId: true, applicantName: true, jobPosting: { select: { recruiterId: true } } },
    });
    if (!app || app.jobPosting?.recruiterId !== userId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!app.resumeId) return NextResponse.json({ error: "no_resume" }, { status: 404 });

    const resume = await prisma.resume.findUnique({
      where: { id: app.resumeId },
      select: { data: true, renderer: true },
    });
    if (!resume) return NextResponse.json({ error: "resume_missing" }, { status: 404 });

    const pdf = await renderResumeThemedPdf(resume.data as any, resume.renderer || "professional");
    const safe = (app.applicantName || "candidate").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);

    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safe}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[GET /api/recruiter/applications/[id]/resume]", e);
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  }
}
