// app/api/recruiter/runs/[id]/pdf/route.ts
// Render a saved shortlist to a printable PDF (type-aware columns).

import { NextResponse } from "next/server";
import { loadRunReport, RunReportError } from "@/lib/loadRunReport";
import { buildCardsHtml } from "@/lib/shortlistReport";
import { renderHtmlToPdf } from "@/lib/resumeThemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { run, candidates, safeName } = await loadRunReport(params.id);
    const pdf = await renderHtmlToPdf(buildCardsHtml(run, candidates));
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
