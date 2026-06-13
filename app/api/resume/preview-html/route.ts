// app/api/resume/preview-html/route.ts
//
// Renders resume data (the LIVE, possibly-unsaved editor state) with a JSON
// Resume theme and returns the HTML. Used by the builder's live preview so
// what you see is exactly what the PDF produces (same renderResumeHtml path).
//
// POST { data, theme } -> { html }

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import { renderResumeHtml } from "@/lib/resumeThemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    await getUserFromRequest(); // any signed-in user may preview their own data
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const data = body?.data;
  const theme = typeof body?.theme === "string" ? body.theme : undefined;
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "missing_data" }, { status: 400 });
  }

  try {
    const { html, hasContent } = await renderResumeHtml(data, theme);
    return NextResponse.json({ html, hasContent });
  } catch (e: any) {
    console.error("[resume/preview-html]", e?.message);
    return NextResponse.json(
      { error: "render_failed", detail: e?.message || "Could not render preview." },
      { status: 500 },
    );
  }
}
