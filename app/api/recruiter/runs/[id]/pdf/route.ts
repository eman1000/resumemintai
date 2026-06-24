// app/api/recruiter/runs/[id]/pdf/route.ts
// Render a saved shortlist to a clean, printable PDF (ranked candidates with
// scores, verdicts, strengths/gaps, and contact details).

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRecruiter, RecruiterGateError, recruiterGateResponse } from "@/lib/recruiterBilling";
import { renderHtmlToPdf } from "@/lib/resumeThemes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const esc = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireRecruiter();
    const run = await prisma.shortlistRun.findUnique({ where: { id: params.id } });
    if (!run || run.recruiterId !== userId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const candidates = await prisma.shortlistCandidate.findMany({
      where: { runId: run.id },
      orderBy: [{ score: "desc" }],
    });

    const scoreColor = (s: number) => (s >= 75 ? "#15803d" : s >= 50 ? "#b45309" : "#374151");

    const rows = candidates
      .map((c, i) => {
        const strengths = ((c.strengths as string[]) || []).map((s) => `<li>${esc(s)}</li>`).join("");
        const gaps = ((c.gaps as string[]) || []).map((s) => `<li>${esc(s)}</li>`).join("");
        const links = ((c.links as string[]) || []).map((u) => `<a href="${esc(u)}">${esc(u)}</a>`).join(" · ");
        const contactBits = [
          c.email ? `✉ ${esc(c.email)}` : "",
          c.phone ? `☎ ${esc(c.phone)}` : "",
        ].filter(Boolean).join("  ·  ");
        return `
          <div class="card">
            <div class="head">
              <div><span class="rank">${i + 1}</span> <span class="name">${esc(c.name)}</span></div>
              <div class="score" style="color:${scoreColor(c.score)}">${c.score}/100</div>
            </div>
            ${c.verdict ? `<p class="verdict">${esc(c.verdict)}</p>` : ""}
            ${contactBits ? `<p class="contact">${contactBits}</p>` : ""}
            ${links ? `<p class="links">${links}</p>` : ""}
            ${strengths ? `<div class="sec"><div class="lbl good">Strengths</div><ul>${strengths}</ul></div>` : ""}
            ${gaps ? `<div class="sec"><div class="lbl bad">Gaps</div><ul>${gaps}</ul></div>` : ""}
          </div>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page { margin: 16mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#1d1d20; font-size:12px; }
      h1 { font-size:20px; margin:0 0 2px; }
      .meta { color:#6b7280; font-size:11px; margin-bottom:16px; }
      .card { border:1px solid #e5e7eb; border-radius:10px; padding:12px 14px; margin-bottom:10px; page-break-inside:avoid; }
      .head { display:flex; justify-content:space-between; align-items:baseline; }
      .rank { display:inline-block; min-width:18px; color:#00855a; font-weight:700; }
      .name { font-weight:700; font-size:14px; }
      .score { font-weight:700; }
      .verdict { margin:6px 0 2px; }
      .contact { margin:4px 0; color:#374151; }
      .links { margin:2px 0; color:#00855a; font-size:11px; word-break:break-all; }
      .sec { margin-top:6px; }
      .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.04em; font-weight:700; }
      .lbl.good { color:#15803d; } .lbl.bad { color:#b91c1c; }
      ul { margin:2px 0 0; padding-left:18px; }
      li { margin:1px 0; }
    </style></head><body>
      <h1>${esc(run.label || "Shortlist")}</h1>
      <div class="meta">${candidates.length} candidate${candidates.length === 1 ? "" : "s"} · ${new Date(run.createdAt).toLocaleString()} · ResumeMint</div>
      ${rows || "<p>No candidates.</p>"}
    </body></html>`;

    const pdf = await renderHtmlToPdf(html);
    const safe = (run.label || "shortlist").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safe}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof RecruiterGateError) {
      const r = recruiterGateResponse(e);
      return NextResponse.json(r.body, { status: r.status });
    }
    console.error("[GET /api/recruiter/runs/[id]/pdf]", e);
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
