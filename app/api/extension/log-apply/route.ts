// app/api/extension/log-apply/route.ts
//
// Records an application in the user's tracker when they hit "Apply" via the
// extension. Same idea as POST /api/applications but accepts the extension
// token instead of a Firebase bearer.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set([
  "draft",
  "submitted",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
]);

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    ats?: string;
    jobUrl?: string;
    jobSnapshot?: any;
    status?: string;
  };

  const ats = (body.ats || "extension").toString().slice(0, 32).toLowerCase();
  const status = body.status && VALID_STATUSES.has(body.status) ? body.status : "applied";
  const snapshot = body.jobSnapshot ?? { source: body.jobUrl };

  // Dedupe within 24h on (ats, source)
  if (snapshot.source) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dup = await prisma.application.findFirst({
      where: { userId, ats, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, jobSnapshot: true },
    });
    if (dup && (dup.jobSnapshot as any)?.source === snapshot.source) {
      return NextResponse.json({ id: dup.id, status: dup.status, duplicate: true });
    }
  }

  const created = await prisma.application.create({
    data: {
      userId,
      ats,
      status,
      jobSnapshot: snapshot,
      submittedAt: status === "submitted" ? new Date() : null,
    },
    select: { id: true, status: true },
  });
  return NextResponse.json({ id: created.id, status: created.status });
}
