// app/api/extension/version/route.ts
// Public: the latest published extension version, so an installed extension can
// block itself when it's out of date. No auth (the panel checks this on load).
import { NextResponse } from "next/server";
import { EXTENSION_LATEST_VERSION } from "@/lib/extensionVersion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { latest: EXTENSION_LATEST_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
