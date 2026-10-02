// app/api/extension/download/route.ts
//
// Gated download of the ResumeMint Apply extension zip. The zip lives OUTSIDE
// public/ (in private-assets/) so it is NOT statically served — the only way
// to get it is through this route, which requires a signed-in user with an
// active subscription. Auth is via the Firebase ID token (Bearer header),
// because the site uses client-side Firebase auth (no session cookie), so the
// install page must fetch this with the token and trigger a blob download.

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { adminAuth } from "@/lib/firebaseAdmin";
import prisma from "@/lib/prisma";
import { ensureDbUserByFirebaseUid } from "@/app/api/server/db/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE = ["active", "trialing", "past_due"];
const ZIP_PATH = path.join(process.cwd(), "private-assets", "extension", "resumemint-apply-latest.zip");
const ZIP_NAME = "resumemint-apply-latest.zip";

export async function GET(req: Request) {
  // 1. Authenticate (Bearer ID token).
  const authz = req.headers.get("authorization") || "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Sign in to download the extension." },
      { status: 401 },
    );
  }

  let userId: string;
  try {
    const dec = await adminAuth.verifyIdToken(idToken);
    userId = await ensureDbUserByFirebaseUid(dec.uid, (dec.email || "").toLowerCase() || null);
  } catch {
    return NextResponse.json(
      { error: "unauthorized", detail: "Your session expired. Sign in again." },
      { status: 401 },
    );
  }

  // 2. Require an active subscription.
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE } },
    select: { id: true },
  });
  if (!sub) {
    return NextResponse.json(
      { error: "subscription_required", detail: "ResumeMint Apply is a PRO feature. Upgrade to download." },
      { status: 403 },
    );
  }

  // 3. Stream the zip from the private location.
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(ZIP_PATH);
  } catch {
    return NextResponse.json(
      { error: "unavailable", detail: "The extension package is temporarily unavailable." },
      { status: 503 },
    );
  }

  return new NextResponse(bytes as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${ZIP_NAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
