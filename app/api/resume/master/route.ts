// app/api/resume/master/route.ts
//
// Returns the id of the caller's MASTER resume (their source-of-truth/original).
// Used by the /profile page to open the master for editing. Returns id:null when
// the user has no resume yet (caller then sends them to create one).

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import { getUserByFirebaseUid } from "@/app/api/server/db/user";
import { getMasterResumeId, setMasterResume } from "@/lib/masterResume";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fb = await getUserFromRequest();
    const user = await getUserByFirebaseUid(fb.uid);
    if (!user?.id) return NextResponse.json({ id: null });
    const id = await getMasterResumeId(user.id);
    return NextResponse.json({ id });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") {
      return NextResponse.json({ error: e.message || "unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/resume/master]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// Designate a resume as the user's master.
export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const user = await getUserByFirebaseUid(fb.uid);
    if (!user?.id) return NextResponse.json({ error: "no_user" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const resumeId = String(body?.resumeId || "");
    if (!resumeId) return NextResponse.json({ error: "missing_resumeId" }, { status: 400 });

    const ok = await setMasterResume(user.id, resumeId);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, id: resumeId });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") {
      return NextResponse.json({ error: e.message || "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/resume/master]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
