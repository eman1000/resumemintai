// lib/shortlistReport.ts
// Build recruiter shortlist reports (PDF cards, Word table, CSV) from a run +
// its candidates. Columns adapt to the run's candidateType (experienced vs
// intern). Age/gender appear only for display — they never affect scoring.

export type ReportCandidate = {
  name: string;
  score: number;
  verdict: string | null;
  strengths: string[];
  gaps: string[];
  email: string | null;
  phone: string | null;
  links: string[];
  age: number | null;
  gender: string | null;
  yearsExperience: number | null;
  currentRole: string | null;
  qualification: string | null;
  certifications: string | null;
  education: string | null;
  academicResults: string | null;
  source: string | null;
};

export type ReportRun = {
  label: string;
  candidateType: string; // "experienced" | "intern"
  createdAt: string | Date;
};

const isIntern = (run: ReportRun) => run.candidateType === "intern";

export const esc = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function contactText(c: ReportCandidate): string {
  return [c.email, c.phone].filter(Boolean).join(" · ");
}

/** Verdict + strengths/gaps condensed into one comment cell. */
export function commentText(c: ReportCandidate): string {
  const parts: string[] = [];
  if (c.verdict) parts.push(c.verdict);
  if (c.strengths.length) parts.push("Strengths: " + c.strengths.join("; "));
  if (c.gaps.length) parts.push("Gaps: " + c.gaps.join("; "));
  return parts.join(" — ");
}

/** Qualifications & experience cell (experienced candidates). */
function qualExp(c: ReportCandidate): string {
  const bits: string[] = [];
  if (c.yearsExperience != null) bits.push(`${c.yearsExperience} yrs experience`);
  if (c.currentRole) bits.push(c.currentRole);
  if (c.qualification) bits.push(c.qualification);
  if (c.certifications) bits.push(c.certifications);
  return bits.join(" · ");
}

// Type-aware column definitions (header + value accessor).
function columns(run: ReportRun): { h: string; v: (c: ReportCandidate, i: number) => string }[] {
  const base = [
    { h: "#", v: (_c: ReportCandidate, i: number) => String(i + 1) },
    { h: "Name", v: (c: ReportCandidate) => c.name },
    { h: "Contact", v: (c: ReportCandidate) => contactText(c) },
    { h: "Age", v: (c: ReportCandidate) => (c.age != null ? String(c.age) : "") },
    { h: "Gender", v: (c: ReportCandidate) => c.gender || "" },
  ];
  const mid = isIntern(run)
    ? [
        { h: "Program & College", v: (c: ReportCandidate) => c.education || "" },
        { h: "Academic Results", v: (c: ReportCandidate) => c.academicResults || "" },
      ]
    : [{ h: "Qualifications & Experience", v: (c: ReportCandidate) => qualExp(c) }];
  const tail = [
    { h: "Source", v: (c: ReportCandidate) => c.source || "" },
    { h: "Score", v: (c: ReportCandidate) => `${c.score}/100` },
    { h: "Comment", v: (c: ReportCandidate) => commentText(c) },
  ];
  return [...base, ...mid, ...tail];
}

function meta(run: ReportRun, n: number): string {
  const type = isIntern(run) ? "Interns / students" : "Experienced candidates";
  return `${n} candidate${n === 1 ? "" : "s"} · ${type} · ${new Date(run.createdAt).toLocaleString()} · ResumeMint`;
}

/** CSV (Excel-friendly). */
export function buildCsv(run: ReportRun, cands: ReportCandidate[]): string {
  const cols = columns(run);
  const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const header = cols.map((c) => q(c.h)).join(",");
  const rows = cands.map((c, i) => cols.map((col) => q(col.v(c, i))).join(","));
  return [header, ...rows].join("\r\n");
}

/** Word-compatible HTML table (served as application/msword .doc). */
export function buildTableHtml(run: ReportRun, cands: ReportCandidate[]): string {
  const cols = columns(run);
  const head = cols.map((c) => `<th>${esc(c.h)}</th>`).join("");
  const body = cands
    .map((c, i) => `<tr>${cols.map((col) => `<td>${esc(col.v(c, i))}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#1d1d20;}
    h1{font-size:15pt;margin:0 0 2pt;}
    .meta{color:#666;font-size:9pt;margin-bottom:10pt;}
    table{border-collapse:collapse;width:100%;}
    th,td{border:1px solid #999;padding:5pt 7pt;vertical-align:top;text-align:left;font-size:9pt;}
    th{background:#0f1b2d;color:#fff;}
  </style></head><body>
    <h1>${esc(run.label || "Shortlist")} — Final Shortlist</h1>
    <div class="meta">${esc(meta(run, cands.length))}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
}

/** Print/Export PDF layout — one card per candidate. */
export function buildCardsHtml(run: ReportRun, cands: ReportCandidate[]): string {
  const scoreColor = (s: number) => (s >= 75 ? "#15803d" : s >= 50 ? "#b45309" : "#374151");
  const cards = cands
    .map((c, i) => {
      const facts: string[] = [];
      if (c.age != null) facts.push(`Age ${c.age}`);
      if (c.gender) facts.push(esc(c.gender));
      if (isIntern(run)) {
        if (c.education) facts.push(esc(c.education));
        if (c.academicResults) facts.push(esc(c.academicResults));
      } else {
        if (c.yearsExperience != null) facts.push(`${c.yearsExperience} yrs exp`);
        if (c.currentRole) facts.push(esc(c.currentRole));
        if (c.qualification) facts.push(esc(c.qualification));
        if (c.certifications) facts.push(esc(c.certifications));
      }
      if (c.source) facts.push(esc(c.source));
      const contactBits = [c.email ? `✉ ${esc(c.email)}` : "", c.phone ? `☎ ${esc(c.phone)}` : ""].filter(Boolean).join("  ·  ");
      const links = (c.links || []).map((u) => `<a href="${esc(u)}">${esc(u)}</a>`).join(" · ");
      const strengths = c.strengths.map((s) => `<li>${esc(s)}</li>`).join("");
      const gaps = c.gaps.map((s) => `<li>${esc(s)}</li>`).join("");
      return `
        <div class="card">
          <div class="head"><div><span class="rank">${i + 1}</span> <span class="name">${esc(c.name)}</span></div>
            <div class="score" style="color:${scoreColor(c.score)}">${c.score}/100</div></div>
          ${facts.length ? `<p class="facts">${facts.join("  ·  ")}</p>` : ""}
          ${contactBits ? `<p class="contact">${contactBits}</p>` : ""}
          ${links ? `<p class="links">${links}</p>` : ""}
          ${c.verdict ? `<p class="verdict">${esc(c.verdict)}</p>` : ""}
          ${strengths ? `<div class="sec"><div class="lbl good">Strengths</div><ul>${strengths}</ul></div>` : ""}
          ${gaps ? `<div class="sec"><div class="lbl bad">Gaps</div><ul>${gaps}</ul></div>` : ""}
        </div>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:16mm;} *{box-sizing:border-box;}
    body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d20;font-size:12px;}
    h1{font-size:20px;margin:0 0 2px;} .meta{color:#6b7280;font-size:11px;margin-bottom:16px;}
    .card{border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:10px;page-break-inside:avoid;}
    .head{display:flex;justify-content:space-between;align-items:baseline;}
    .rank{display:inline-block;min-width:18px;color:#00855a;font-weight:700;} .name{font-weight:700;font-size:14px;}
    .score{font-weight:700;} .facts{margin:4px 0;color:#374151;} .verdict{margin:6px 0 2px;}
    .contact{margin:4px 0;color:#374151;} .links{margin:2px 0;color:#00855a;font-size:11px;word-break:break-all;}
    .sec{margin-top:6px;} .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;}
    .lbl.good{color:#15803d;} .lbl.bad{color:#b91c1c;} ul{margin:2px 0 0;padding-left:18px;} li{margin:1px 0;}
  </style></head><body>
    <h1>${esc(run.label || "Shortlist")}</h1>
    <div class="meta">${esc(meta(run, cands.length))}</div>
    ${cards || "<p>No candidates.</p>"}
  </body></html>`;
}
