// app/api/recruiter/runs/[id]/csv/route.ts — shortlist as a CSV spreadsheet.

import { NextResponse } from "next/server";
import { loadRunReport, RunReportError } from "@/lib/loadRunReport";
import { buildCsv } from "@/lib/shortlistReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { run, candidates, safeName } = await loadRunReport(params.id);
    const csv = "﻿" + buildCsv(run, candidates); // BOM for Excel
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return RunReportError.toResponse(e, "[GET runs/[id]/csv]");
  }
}
