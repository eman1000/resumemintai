// app/api/board/[slug]/route.ts
// Public: fetch one open posting by slug for the job detail / apply page.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const job = await prisma.jobPosting.findUnique({ where: { slug: params.slug } });
    if (!job || job.status !== "open") return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
      job: {
        slug: job.slug,
        title: job.title,
        company: job.company,
        location: job.location,
        employmentType: job.employmentType,
        remote: job.remote,
        description: job.description,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        createdAt: job.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[GET /api/board/[slug]]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
