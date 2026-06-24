// app/api/recruiter/jobs/route.ts
//
// Recruiter job postings (owner view).
//   GET  → list the current recruiter's postings + application counts
//   POST → create a posting (published to the public board unless status=draft)
// Both require an active recruiter subscription.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";
import { jobSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["draft", "open", "closed"]);
const EMPLOYMENT = new Set(["full-time", "part-time", "contract", "internship", "temporary"]);

export async function GET() {
  try {
    const { userId } = await requireRecruiter();
    const rows = await prisma.jobPosting.findMany({
      where: { recruiterId: userId },
      orderBy: [{ createdAt: "desc" }],
      include: { _count: { select: { applications: true } } },
    });
    const items = rows.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      company: j.company,
      location: j.location,
      employmentType: j.employmentType,
      remote: j.remote,
      status: j.status,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      currency: j.currency,
      applicants: j._count.applications,
      createdAt: j.createdAt.toISOString(),
    }));
    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[GET /api/recruiter/jobs]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireRecruiter();
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { companyName: true } });

    const b = (await req.json().catch(() => ({}))) as any;
    const title = String(b.title || "").trim().slice(0, 160);
    const company = String(b.company || me?.companyName || "").trim().slice(0, 120);
    const description = String(b.description || "").trim().slice(0, 20000);
    if (!title) return NextResponse.json({ error: "missing_title" }, { status: 400 });
    if (!company) return NextResponse.json({ error: "missing_company" }, { status: 400 });
    if (description.length < 20)
      return NextResponse.json({ error: "missing_description" }, { status: 400 });

    const status = STATUSES.has(b.status) ? b.status : "open";
    const employmentType = EMPLOYMENT.has(b.employmentType) ? b.employmentType : null;
    const location = b.location ? String(b.location).trim().slice(0, 160) : null;
    const remote = !!b.remote;
    const salaryMin = Number.isFinite(+b.salaryMin) && +b.salaryMin > 0 ? Math.round(+b.salaryMin) : null;
    const salaryMax = Number.isFinite(+b.salaryMax) && +b.salaryMax > 0 ? Math.round(+b.salaryMax) : null;
    const currency = b.currency ? String(b.currency).trim().slice(0, 8) : "USD";

    const created = await prisma.jobPosting.create({
      data: {
        recruiterId: userId,
        slug: jobSlug(title, company),
        title,
        company,
        location,
        employmentType,
        remote,
        description,
        salaryMin,
        salaryMax,
        currency,
        status,
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[POST /api/recruiter/jobs]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
