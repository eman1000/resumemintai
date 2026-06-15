// app/api/cover-letters/pdf/route.ts
// Render the current cover-letter data to a one-page A4 PDF for download.
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/server/auth/getUserFromRequest";
import { renderHtmlToPdf } from "@/lib/resumeThemes";
import { coverLetterToHtml, type CoverLetterDoc } from "@/lib/coverLetterGen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await getUserFromRequest(); // require sign-in
    const body = await req.json().catch(() => ({}));
    const data = body?.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "missing_data" }, { status: 400 });
    }
    const html = coverLetterToHtml(data as CoverLetterDoc);
    const pdf = await renderHtmlToPdf(html);
    const filename = String(body?.filename || "cover-letter").replace(/[^a-z0-9_-]+/gi, "-");
    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (e: any) {
    if (e?.name === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[POST /api/cover-letters/pdf]", e);
    return NextResponse.json({ error: "pdf_failed", detail: e?.message }, { status: 500 });
  }
}
