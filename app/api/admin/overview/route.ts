// app/api/admin/overview/route.ts — platform-wide counts + recent activity.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminGateError, adminGateResponse } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE = ["active", "trialing", "past_due"];

export async function GET() {
  try {
    await requireAdmin();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [users, newUsers, resumes, coverLetters, shortlistRuns, applications, jobPostings, recruiters, activeSubs, recentUsers, recentRuns] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: since } } }),
        prisma.resume.count(),
        prisma.coverLetter.count(),
        prisma.shortlistRun.count(),
        prisma.jobApplication.count(),
        prisma.jobPosting.count(),
        prisma.user.count({ where: { userType: "recruiter" } }),
        prisma.subscription.count({ where: { status: { in: ACTIVE } } }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, email: true, userType: true, plan: true, createdAt: true },
        }),
        prisma.shortlistRun.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true, label: true, createdAt: true,
            recruiter: { select: { email: true } },
            _count: { select: { candidates: true } },
          },
        }),
      ]);

    return NextResponse.json({
      counts: { users, newUsers, recruiters, resumes, coverLetters, shortlistRuns, applications, jobPostings, activeSubs },
      recentUsers: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
      recentRuns: recentRuns.map((r) => ({
        id: r.id, label: r.label || "Shortlist", email: r.recruiter?.email || null,
        candidates: r._count.candidates, createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof AdminGateError) { const r = adminGateResponse(e); return NextResponse.json(r.body, { status: r.status }); }
    console.error("[GET /api/admin/overview]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
