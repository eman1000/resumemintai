// app/api/recruiter/jobs/[id]/route.ts
//
// Manage a single posting the recruiter owns.
//   GET    → posting + applicants + most-recent AI shortlist of those applicants
//   PATCH  → edit fields / change status (open|closed|draft)
//   DELETE → delete the posting (cascades applications)

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["draft", "open", "closed"]);
const EMPLOYMENT = new Set(["full-time", "part-time", "contract", "internship", "temporary"]);
const APP_STATUSES = new Set(["submitted", "reviewing", "shortlisted", "rejected", "withdrawn"]);

async function ownPosting(id: string, recruiterId: string) {
  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job || job.recruiterId !== recruiterId) return null;
  return job;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();
    const job = await ownPosting(params.id, userId);
    if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const applications = await prisma.jobApplication.findMany({
      where: { jobPostingId: job.id },
      orderBy: [{ createdAt: "desc" }],
    });

    const latestRun = await prisma.shortlistRun.findFirst({
      where: { recruiterId: userId, jobPostingId: job.id },
      orderBy: [{ createdAt: "desc" }],
      include: { candidates: { orderBy: [{ score: "desc" }] } },
    });

    // score-by-applicationId from the latest run (if any)
    const scoreByApp = new Map<string, { score: number; verdict: string | null; strengths: any; gaps: any }>();
    for (const c of latestRun?.candidates || []) {
      if (c.applicationId) scoreByApp.set(c.applicationId, { score: c.score, verdict: c.verdict, strengths: c.strengths, gaps: c.gaps });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        slug: job.slug,
        title: job.title,
        company: job.company,
        location: job.location,
        employmentType: job.employmentType,
        remote: job.remote,
        description: job.description,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
      },
      applicants: applications.map((a) => ({
        id: a.id,
        name: a.applicantName || "Candidate",
        email: a.applicantEmail || null,
        status: a.status,
        note: a.note || null,
        resumeId: a.resumeId,
        hasResumeText: !!a.resumeText,
        createdAt: a.createdAt.toISOString(),
        ranking: scoreByApp.get(a.id) || null,
      })),
      shortlist: latestRun
        ? { id: latestRun.id, createdAt: latestRun.createdAt.toISOString(), count: latestRun.candidates.length }
        : null,
    });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[GET /api/recruiter/jobs/[id]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();
    const job = await ownPosting(params.id, userId);
    if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const b = (await req.json().catch(() => ({}))) as any;
    const data: any = {};
    if (typeof b.title === "string") data.title = b.title.trim().slice(0, 160);
    if (typeof b.company === "string") data.company = b.company.trim().slice(0, 120);
    if (typeof b.description === "string") data.description = b.description.trim().slice(0, 20000);
    if (typeof b.location === "string") data.location = b.location.trim().slice(0, 160) || null;
    if (typeof b.remote === "boolean") data.remote = b.remote;
    if (EMPLOYMENT.has(b.employmentType)) data.employmentType = b.employmentType;
    if (b.employmentType === null) data.employmentType = null;
    if (b.salaryMin === null || Number.isFinite(+b.salaryMin)) data.salaryMin = b.salaryMin === null ? null : Math.round(+b.salaryMin) || null;
    if (b.salaryMax === null || Number.isFinite(+b.salaryMax)) data.salaryMax = b.salaryMax === null ? null : Math.round(+b.salaryMax) || null;
    if (typeof b.currency === "string") data.currency = b.currency.trim().slice(0, 8);
    if (STATUSES.has(b.status)) {
      data.status = b.status;
      if (b.status === "closed") data.closedAt = new Date();
    }

    // Allow updating an applicant's status: { applicationId, applicantStatus }
    if (b.applicationId && APP_STATUSES.has(b.applicantStatus)) {
      const app = await prisma.jobApplication.findUnique({ where: { id: b.applicationId }, select: { jobPostingId: true } });
      if (app?.jobPostingId === job.id) {
        await prisma.jobApplication.update({ where: { id: b.applicationId }, data: { status: b.applicantStatus } });
      }
      if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });
    }

    const updated = await prisma.jobPosting.update({ where: { id: job.id }, data, select: { id: true, status: true } });
    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[PATCH /api/recruiter/jobs/[id]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();
    const job = await ownPosting(params.id, userId);
    if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.jobPosting.delete({ where: { id: job.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[DELETE /api/recruiter/jobs/[id]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
