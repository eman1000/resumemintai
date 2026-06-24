// app/api/recruiter/runs/[id]/docx/route.ts
// Shortlist as a Word-openable document. We serve a Word-compatible HTML table
// with the msword MIME + .doc filename (opens as an editable table in Word) —
// no extra dependency needed.

import { NextResponse } from "next/server";
import { loadRunReport, RunReportError } from "@/lib/loadRunReport";
import { buildTableHtml } from "@/lib/shortlistReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { run, candidates, safeName } = await loadRunReport(params.id);
    const html = buildTableHtml(run, candidates);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="${safeName}.doc"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return RunReportError.toResponse(e, "[GET runs/[id]/docx]");
  }
}
