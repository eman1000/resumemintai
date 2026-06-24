// app/api/recruiter/runs/route.ts
// Recent AI shortlisting runs for the current recruiter (history list).

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await requireRecruiter();
    const runs = await prisma.shortlistRun.findMany({
      where: { recruiterId: userId },
      orderBy: [{ createdAt: "desc" }],
      take: 30,
      include: {
        _count: { select: { candidates: true } },
        candidates: { orderBy: [{ score: "desc" }], take: 1, select: { name: true, score: true } },
      },
    });
    return NextResponse.json({
      items: runs.map((r) => ({
        id: r.id,
        label: r.label || "Shortlist",
        jobPostingId: r.jobPostingId,
        candidates: r._count.candidates,
        top: r.candidates[0] || null,
        createdAt: r.createdAt.toISOString(),
      })),
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
