// app/api/recruiter/runs/[id]/pdf/route.ts
// Render a saved shortlist to a printable PDF (type-aware columns).

import { NextResponse } from "next/server";
import { loadRunReport, RunReportError } from "@/lib/loadRunReport";
import { buildCardsHtml, buildTableHtml } from "@/lib/shortlistReport";
import { renderHtmlToPdf } from "@/lib/resumeThemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const style = new URL(req.url).searchParams.get("style") === "table" ? "table" : "cards";
    const { run, candidates, safeName } = await loadRunReport(params.id);
    const html = style === "table" ? buildTableHtml(run, candidates) : buildCardsHtml(run, candidates);
    const pdf = await renderHtmlToPdf(html);
    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return RunReportError.toResponse(e, "[GET runs/[id]/pdf]");
  }
}
