// app/api/resume/pdf/route.ts
//
// Server-rendered themed PDF download for the builder. Takes the CURRENT
// editor data + theme (so it works for saved, local, and unsaved resumes and
// always matches the live preview). Auth + active-subscription gated.
//
// POST { data, theme, filename? } -> application/pdf

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { adminAuth } from "@/lib/firebaseAdmin";
import { ensureDbUserByFirebaseUid } from "@/app/api/server/db/user";
import { renderResumeThemedPdf } from "@/lib/resumeThemes";
import { jsonResumeHasContent, toJsonResume } from "@/lib/jsonResume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ACTIVE = ["active", "trialing", "past_due"];

export async function POST(req: Request) {
  const authz = req.headers.get("authorization") || "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let userId: string;
  try {
    const dec = await adminAuth.verifyIdToken(idToken);
    userId = await ensureDbUserByFirebaseUid(dec.uid, (dec.email || "").toLowerCase() || null);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE } },
    select: { id: true },
  });
  if (!sub) {
    return NextResponse.json(
      { error: "subscription_required", detail: "Download is a PRO feature." },
      { status: 403 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const data = body?.data;
  const theme = typeof body?.theme === "string" ? body.theme : undefined;
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "missing_data" }, { status: 400 });
  }
  if (!jsonResumeHasContent(toJsonResume(data))) {
    return NextResponse.json(
      { error: "resume_empty", detail: "Add your details before downloading." },
      { status: 422 },
    );
  }

  try {
    const bytes = await renderResumeThemedPdf(data, theme);
    const safe = String(body?.filename || "resume").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 60) || "resume";
    return new NextResponse(bytes as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safe}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[resume/pdf]", e?.message);
    return NextResponse.json({ error: "render_failed", detail: e?.message }, { status: 500 });
  }
}
