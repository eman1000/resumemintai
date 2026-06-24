// lib/loadRunReport.ts
// Shared loader for the recruiter shortlist report endpoints (PDF/CSV/DOCX):
// gate on recruiter ownership, fetch run + ranked candidates, map to the report
// shape.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";
import type { ReportCandidate, ReportRun } from "@/lib/shortlistReport";

export class RunReportError {
  static toResponse(e: unknown, tag: string) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    if ((e as any)?.code === "NOT_FOUND") return NextResponse.json({ error: "not_found" }, { status: 404 });
    console.error(tag, e);
    return NextResponse.json({ error: "report_failed" }, { status: 500 });
  }
}

export async function loadRunReport(
  id: string,
): Promise<{ run: ReportRun; candidates: ReportCandidate[]; safeName: string }> {
  const { userId } = await requireRecruiter();
  const run = await prisma.shortlistRun.findUnique({ where: { id } });
  if (!run || run.recruiterId !== userId) {
    const err: any = new Error("not_found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const rows = await prisma.shortlistCandidate.findMany({ where: { runId: run.id }, orderBy: [{ score: "desc" }] });
  const candidates: ReportCandidate[] = rows.map((c) => ({
    name: c.name,
    score: c.score,
    verdict: c.verdict,
    fitCategory: c.fitCategory,
    strengths: (c.strengths as string[]) || [],
    gaps: (c.gaps as string[]) || [],
    email: c.email,
    phone: c.phone,
    links: (c.links as string[]) || [],
    age: c.age,
    gender: c.gender,
    yearsExperience: c.yearsExperience,
    currentRole: c.currentRole,
    qualification: c.qualification,
    certifications: c.certifications,
    education: c.education,
    academicResults: c.academicResults,
    source: c.source,
  }));
  const reportRun: ReportRun = {
    label: run.label || "Shortlist",
    candidateType: run.candidateType || "experienced",
    createdAt: run.createdAt,
  };
  const safeName = (run.label || "shortlist").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
  return { run: reportRun, candidates, safeName };
}
