// app/api/extension/exchange/route.ts
//
// Called by the /extension/connect page after the user has signed in via
// Firebase. Verifies their Firebase ID token, ensures the DB user row, and
// returns a long-lived extension token the popup stores in
// chrome.storage.local.

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import prisma from "@/lib/prisma";
import { ensureDbUserByFirebaseUid } from "@/app/api/server/db/user";
import { signExtensionToken } from "@/lib/extensionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "missing_auth" }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || "").trim().toLowerCase() || null;
    const userId = await ensureDbUserByFirebaseUid(decoded.uid, email);

    // Confirm the user actually exists in our DB.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firebaseUid: true },
    });
    if (!me) return NextResponse.json({ error: "no_user" }, { status: 403 });

    const token = signExtensionToken(me.id);
    return NextResponse.json({
      token,
      user: { uid: me.firebaseUid, email: me.email || email },
    });
  } catch (e: any) {
    console.error("[POST /api/extension/exchange]", e);
    return NextResponse.json(
      { error: "exchange_failed", detail: e?.message || "unexpected_error" },
      { status: 500 },
    );
  }
}
