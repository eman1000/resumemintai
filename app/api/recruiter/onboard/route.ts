// app/api/recruiter/onboard/route.ts
//
// Marks the current account as a recruiter (userType = "recruiter") and
// optionally stores a company name. Idempotent. Any authenticated user may
// call this — becoming a recruiter is free; the paid gate is on recruiter
// *features* (see lib/recruiterBilling.ts), not on the role flag.

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const fb = await getUserFromRequest();
    const user = await prisma.user.findUnique({ where: { firebaseUid: fb.uid }, select: { id: true } });
    if (!user?.id) return NextResponse.json({ error: "no_user" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { companyName?: string };
    const companyName = typeof body.companyName === "string" ? body.companyName.trim().slice(0, 120) : undefined;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { userType: "recruiter", ...(companyName ? { companyName } : {}) },
      select: { userType: true, companyName: true },
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED" || e?.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/recruiter/onboard]", e);
    return NextResponse.json({ error: "onboard_failed" }, { status: 500 });
  }
}
