// app/api/admin/users/[id]/route.ts — full detail for one user.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminGateError, adminGateResponse } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const u = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, email: true, firebaseUid: true, userType: true, plan: true, companyName: true,
        stripeCustomerId: true, applicantProfile: true, createdAt: true,
        subscriptions: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, priceId: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, createdAt: true } },
        resumes: { orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, renderer: true, isMaster: true, tailoredForJob: true, thumbnailUrl: true, archived: true, updatedAt: true } },
        coverLetters: { orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, renderer: true, archived: true, updatedAt: true } },
        applications: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, ats: true, status: true, jobSnapshot: true, createdAt: true } },
        jobPostings: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, company: true, status: true, createdAt: true, _count: { select: { applications: true } } } },
        shortlistRuns: { orderBy: { createdAt: "desc" }, take: 100, select: { id: true, label: true, candidateType: true, createdAt: true, _count: { select: { candidates: true } } } },
      },
    });
    if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const events = u.firebaseUid
      ? await prisma.event.findMany({
          where: { uid: u.firebaseUid },
          orderBy: { tsServer: "desc" },
          take: 50,
          select: { event: true, path: true, tsServer: true, country: true, city: true },
        })
      : [];

    return NextResponse.json({
      user: {
        id: u.id, email: u.email, firebaseUid: u.firebaseUid, userType: u.userType, plan: u.plan,
        companyName: u.companyName, stripeCustomerId: u.stripeCustomerId, applicantProfile: u.applicantProfile,
        createdAt: u.createdAt.toISOString(),
      },
      subscriptions: u.subscriptions.map((s) => ({ ...s, currentPeriodEnd: s.currentPeriodEnd?.toISOString() || null, createdAt: s.createdAt.toISOString() })),
      resumes: u.resumes.map((r) => ({ ...r, isTailored: !!r.tailoredForJob, tailoredForJob: undefined, updatedAt: r.updatedAt.toISOString() })),
      coverLetters: u.coverLetters.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })),
      applications: u.applications.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      jobPostings: u.jobPostings.map((j) => ({ id: j.id, title: j.title, company: j.company, status: j.status, applicants: j._count.applications, createdAt: j.createdAt.toISOString() })),
      shortlistRuns: u.shortlistRuns.map((r) => ({ id: r.id, label: r.label || "Shortlist", candidateType: r.candidateType, candidates: r._count.candidates, createdAt: r.createdAt.toISOString() })),
      events: events.map((e) => ({ event: e.event, path: e.path, country: e.country, city: e.city, ts: e.tsServer.toISOString() })),
    });
  } catch (e) {
    if (e instanceof AdminGateError) { const r = adminGateResponse(e); return NextResponse.json(r.body, { status: r.status }); }
    console.error("[GET /api/admin/users/[id]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
