// app/api/board/route.ts
// Public job board: list OPEN internal postings. No auth. Optional ?q= search.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 120);

    const where: any = { status: "open" };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.jobPosting.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      select: {
        slug: true,
        title: true,
        company: true,
        location: true,
        employmentType: true,
        remote: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      items: rows.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() })),
    });
  } catch (e) {
    console.error("[GET /api/board]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
