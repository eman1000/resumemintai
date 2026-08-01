// app/api/resume/preview-html/route.ts
//
// Renders resume data (the LIVE, possibly-unsaved editor state) with a JSON
// Resume theme and returns the HTML. Used by the builder's live preview so
// what you see is exactly what the PDF produces (same renderResumeHtml path).
//
// POST { data, theme } -> { html }

import { NextResponse } from "next/server";
import { renderResumeHtml } from "@/lib/resumeThemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// No auth: renders only the caller's own data (provided in the body) → HTML.
// No DB access or secrets, so safe for anonymous/local-resume previews too.
export async function POST(req: Request) {
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
    // screenPageMargins: the iframe preview is screen media, where @page
    // margins don't apply — mirror them so themes that rely on @page
    // (professional) don't bleed to the page edges.
    const { html, hasContent } = await renderResumeHtml(data, theme, { screenPageMargins: true });
    return NextResponse.json({ html, hasContent });
  } catch (e: any) {
    console.error("[resume/preview-html]", e?.message);
    return NextResponse.json(
      { error: "render_failed", detail: e?.message || "Could not render preview." },
      { status: 500 },
    );
  }
}
