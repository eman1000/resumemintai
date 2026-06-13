// app/api/resume/cleanup/route.ts
//
// LLM-assisted resume cleanup (v1: skills). Returns a reviewable diff of
// proposed changes plus the cleaned data; the client shows the diff and only
// applies it on the user's confirmation. Auth-gated to prevent abuse of the
// LLM call. Conservative by design — see lib/resumeCleanup.ts (never invents).

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import { cleanupResume } from "@/lib/resumeCleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await getUserFromRequest(); // require a signed-in user

    const body = await req.json().catch(() => ({}));
    const data = body?.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "missing_data" }, { status: 400 });
    }

    const { changes, cleanedData } = await cleanupResume(data);
    return NextResponse.json({ changes, cleanedData });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") {
      return NextResponse.json({ error: e.message || "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/resume/cleanup]", e);
    return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
  }
}
