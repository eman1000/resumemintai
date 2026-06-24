// app/api/recruiter/report-style/route.ts
// Recruiter's saved default shortlist report style ("cards" | "table").

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fb = await getUserFromRequest();
    const u = await prisma.user.findUnique({ where: { firebaseUid: fb.uid }, select: { recruiterReportStyle: true } });
    return NextResponse.json({ style: u?.recruiterReportStyle || "cards" });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED" || e?.code === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ style: "cards" });
  }
}

export async function PUT(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const u = await prisma.user.findUnique({ where: { firebaseUid: fb.uid }, select: { id: true } });
    if (!u?.id) return NextResponse.json({ error: "no_user" }, { status: 403 });
    const body = (await req.json().catch(() => ({}))) as { style?: string };
    const style = body.style === "table" ? "table" : "cards";
    await prisma.user.update({ where: { id: u.id }, data: { recruiterReportStyle: style } });
    return NextResponse.json({ ok: true, style });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED" || e?.code === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
