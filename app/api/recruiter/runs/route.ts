// app/api/recruiter/runs/route.ts
// Saved AI shortlists for the current recruiter — paginated + searchable.
// Query: ?page=1&pageSize=20&q=<label search>&type=all|posting|adhoc

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await requireRecruiter();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get("pageSize") || "20", 10) || 20));
    const q = (searchParams.get("q") || "").trim().slice(0, 120);
    const type = searchParams.get("type") || "all";

    const where: any = { recruiterId: userId };
    if (q) where.label = { contains: q, mode: "insensitive" };
    if (type === "posting") where.jobPostingId = { not: null };
    else if (type === "adhoc") where.jobPostingId = null;

    const [total, runs] = await Promise.all([
      prisma.shortlistRun.count({ where }),
      prisma.shortlistRun.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { candidates: true } },
          candidates: { orderBy: [{ score: "desc" }], take: 1, select: { name: true, score: true } },
        },
      }),
    ]);

    return NextResponse.json({
      items: runs.map((r) => ({
        id: r.id,
        label: r.label || "Shortlist",
        jobPostingId: r.jobPostingId,
        type: r.jobPostingId ? "posting" : "adhoc",
        candidates: r._count.candidates,
        top: r.candidates[0] || null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[GET /api/recruiter/runs]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
