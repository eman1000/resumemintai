// app/api/admin/users/route.ts — paginated + searchable user list.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminGateError, adminGateResponse } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") || "25", 10) || 25));
    const q = (searchParams.get("q") || "").trim().slice(0, 120);
    const type = searchParams.get("type") || "all"; // all | recruiter | candidate

    const where: any = {};
    if (q) where.email = { contains: q, mode: "insensitive" };
    if (type === "recruiter") where.userType = "recruiter";
    else if (type === "candidate") where.userType = { not: "recruiter" };

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, email: true, userType: true, plan: true, companyName: true, createdAt: true,
          _count: { select: { resumes: true, coverLetters: true, shortlistRuns: true, applications: true, jobPostings: true, subscriptions: true } },
        },
      }),
    ]);

    return NextResponse.json({
      items: rows.map((u) => ({
        id: u.id, email: u.email, userType: u.userType, plan: u.plan, companyName: u.companyName,
        createdAt: u.createdAt.toISOString(), counts: u._count,
      })),
      total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e) {
    if (e instanceof AdminGateError) { const r = adminGateResponse(e); return NextResponse.json(r.body, { status: r.status }); }
    console.error("[GET /api/admin/users]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
