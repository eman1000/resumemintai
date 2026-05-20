// app/api/extension/me/route.ts — current user, for the popup sanity check.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = userIdFromExtensionRequest(req);
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { firebaseUid: true, email: true },
    });
    if (!u) return NextResponse.json({ error: "no_user" }, { status: 404 });
    return NextResponse.json({ user: { uid: u.firebaseUid, email: u.email } });
  } catch (e: any) {
    if (e?.code === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
