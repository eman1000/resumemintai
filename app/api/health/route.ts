// app/api/health/route.ts
import { NextResponse } from "next/server";
import { ensureStripeSyncKickoff } from "@/lib/schedulers/stripeSyncInit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

ensureStripeSyncKickoff();

export async function GET() {
  return NextResponse.json({ ok: true });
}
