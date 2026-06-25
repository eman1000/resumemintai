// app/api/admin/me/route.ts — is the current user an admin? (for client gating)
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fb = await getUserFromRequest();
    return NextResponse.json({ isAdmin: isAdminEmail(fb.email), email: fb.email || null });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
