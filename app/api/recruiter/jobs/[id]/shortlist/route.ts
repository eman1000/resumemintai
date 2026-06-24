// app/api/recruiter/jobs/[id]/shortlist/route.ts
//
// Run AI shortlisting over a posting's applicants. Uses the posting description
// as the JD and each applicant's frozen resume text. Persists a ShortlistRun +
// ShortlistCandidate rows (linked back to applications) so the ranking shows in
// the recruiter dashboard. Metered against the recruiter-shortlist quota.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from "@/lib/aiUsage";
import { shortlistCandidates, type ShortlistInput } from "@/lib/shortlist";
import { extractContact } from "@/lib/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();

    const job = await prisma.jobPosting.findUnique({ where: { id: params.id } });
    if (!job || job.recruiterId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const quota = await checkAiUsage(userId, "recruiter-shortlist");
    if (!quota.ok) return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });

    const apps = await prisma.jobApplication.findMany({
      where: { jobPostingId: job.id, resumeText: { not: null } },
      select: { id: true, applicantName: true, applicantEmail: true, resumeText: true },
    });
    const appById = new Map(apps.map((a) => [a.id, a]));
    if (!apps.length) {
      return NextResponse.json(
        { error: "no_applicants", detail: "No applicants with readable resumes yet." },
        { status: 422 },
      );
    }

    const candidates: ShortlistInput[] = apps.map((a) => ({
      id: a.id,
      name: a.applicantName || "Candidate",
      text: a.resumeText || "",
    }));

    const ranked = await shortlistCandidates(job.description, candidates);
    await recordAiUsage(userId, "recruiter-shortlist");

    // Enrich with contact details (email from the application, phone/links from
    // the resume text) + a resume-view URL that renders the applicant's resume.
    const results = ranked.map((r) => {
      const app = appById.get(r.id);
      const contact = extractContact(app?.resumeText || "");
      return {
        ...r,
        email: app?.applicantEmail || contact.email || null,
        phone: contact.phone || null,
        links: contact.links || [],
        resumeUrl: `/api/recruiter/applications/${r.id}/resume`,
        resumeName: `${r.name}.pdf`,
      };
    });

    // Persist the run + ranked candidates (linked back to applications).
    const run = await prisma.shortlistRun.create({
      data: {
        recruiterId: userId,
        jobPostingId: job.id,
        label: job.title,
        jdText: job.description.slice(0, 20000),
        candidates: {
          create: results.map((r) => ({
            applicationId: r.id, // candidate id IS the application id here
            name: r.name,
            score: r.score,
            verdict: r.verdict || null,
            strengths: r.strengths as any,
            gaps: r.gaps as any,
            email: r.email,
            phone: r.phone,
            links: r.links as any,
            resumeUrl: r.resumeUrl,
            resumeName: r.resumeName,
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      runId: run.id,
      results,
      quota: {
        remainingDay: Math.max(0, quota.remainingDay - 1),
        remainingMonth: Math.max(0, quota.remainingMonth - 1),
        monthLimit: quota.monthLimit,
      },
    });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[POST /api/recruiter/jobs/[id]/shortlist]", e);
    return NextResponse.json({ error: "shortlist_failed", detail: (e as any)?.message }, { status: 500 });
  }
}
