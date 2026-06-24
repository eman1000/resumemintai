// app/api/recruiter/runs/[id]/route.ts
//   GET    → one saved shortlist + its ranked candidates
//   PATCH  → rename ({ label })
//   DELETE → remove

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownRun(id: string, recruiterId: string) {
  const run = await prisma.shortlistRun.findUnique({ where: { id } });
  if (!run || run.recruiterId !== recruiterId) return null;
  return run;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();
    const run = await ownRun(params.id, userId);
    if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const candidates = await prisma.shortlistCandidate.findMany({
      where: { runId: run.id },
      orderBy: [{ score: "desc" }],
    });

    return NextResponse.json({
      run: {
        id: run.id,
        label: run.label || "Shortlist",
        type: run.jobPostingId ? "posting" : "adhoc",
        candidateType: run.candidateType || "experienced",
        jobPostingId: run.jobPostingId,
        jdText: run.jdText,
        createdAt: run.createdAt.toISOString(),
      },
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        score: c.score,
        verdict: c.verdict,
        fitCategory: c.fitCategory,
        strengths: (c.strengths as string[]) || [],
        gaps: (c.gaps as string[]) || [],
        applicationId: c.applicationId,
        email: c.email,
        phone: c.phone,
        links: (c.links as string[]) || [],
        resumeUrl: c.resumeUrl,
        resumeName: c.resumeName,
        age: c.age,
        gender: c.gender,
        yearsExperience: c.yearsExperience,
        currentRole: c.currentRole,
        qualification: c.qualification,
        certifications: c.certifications,
        education: c.education,
        academicResults: c.academicResults,
        experienceHistory: (c.experienceHistory as any) || [],
        source: c.source,
      })),
    });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[GET /api/recruiter/runs/[id]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();
    const run = await ownRun(params.id, userId);
    if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const b = (await req.json().catch(() => ({}))) as any;
    const label = typeof b.label === "string" ? b.label.trim().slice(0, 120) : "";
    if (!label) return NextResponse.json({ error: "missing_label" }, { status: 400 });

    await prisma.shortlistRun.update({ where: { id: run.id }, data: { label } });
    return NextResponse.json({ ok: true, label });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[PATCH /api/recruiter/runs/[id]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();
    const run = await ownRun(params.id, userId);
    if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.shortlistRun.delete({ where: { id: run.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[DELETE /api/recruiter/runs/[id]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
