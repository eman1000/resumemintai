// lib/themes/professional.ts
//
// "Professional" — a clean, single-column, ATS-friendly theme recreated from the
// user's Mediatropy resume (the one that landed many interviews): centered light
// name, grey uppercase section headers with a hairline rule, ■ item titles +
// italic grey stack/date line + ● bullets, and a two-column education block.
//
// Pure HTML/CSS (self-contained — no CDN), rendered in-process (no child needed).
// Consumes the JSON Resume shape from lib/jsonResume.ts.

import type { JsonResume } from "@/lib/jsonResume";

function esc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO "2022-01-01" → "Jan 2022". Empty → "". */
function fmtDate(iso: any): string {
  const s = String(iso || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const mo = MONTHS[parseInt(m[2], 10) - 1];
    return mo ? `${mo} ${m[1]}` : m[1];
  }
  const y = s.match(/^(\d{4})$/);
  return y ? y[1] : s;
}

function fmtRange(start: any, end: any): string {
  const a = fmtDate(start);
  const b = fmtDate(end);
  if (a && b) return `${a} – ${b}`;
  if (a && !b) return `${a} – Present`;
  return a || b || "";
}

function bullets(items: any[]): string {
  const li = (items || []).map((b) => `<li>${esc(b)}</li>`).join("");
  return li ? `<ul class="rm-bullets">${li}</ul>` : "";
}

function section(title: string, body: string): string {
  if (!body || !body.trim()) return "";
  return `<section class="rm-block"><h2 class="rm-sec">${esc(title)}</h2>${body}</section>`;
}

export function renderProfessional(jr: JsonResume): string {
  const b = jr.basics || {};
  const loc = b.location || {};

  // ---- header ----
  const header = `
    <header class="rm-head">
      <h1>${esc(b.name || "")}</h1>
      ${b.label ? `<div class="rm-subtitle">${esc(b.label)}</div>` : ""}
    </header>`;

  // ---- contact ----
  const contactBits: string[] = [];
  if (b.phone) contactBits.push(esc(b.phone));
  if (b.email) contactBits.push(`<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`);
  if (b.url) contactBits.push(`<a href="${esc(b.url)}">${esc(b.url.replace(/^https?:\/\//, ""))}</a>`);
  for (const p of b.profiles || []) {
    if (p?.url) contactBits.push(`<a href="${esc(p.url)}">${esc(p.network || p.url)}</a>`);
  }
  const cityLine = [loc.city, loc.region].filter(Boolean).join(", ");
  if (cityLine) contactBits.push(esc(cityLine));
  const contact = section(
    "Contact",
    contactBits.length ? `<div class="rm-contact">${contactBits.map((c) => `<span>${c}</span>`).join("")}</div>` : "",
  );

  // ---- about / summary ----
  const summaryHtml = String(b.summary || "")
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");
  const about = section("About", summaryHtml);

  // ---- projects (Selected Work) ----
  const projectsBody = (jr.projects || [])
    .map((p) => {
      const meta = [(p.keywords || []).join(" · "), fmtRange(p.startDate, p.endDate)].filter(Boolean).join("  ·  ");
      return `<div class="rm-item">
        <div class="rm-item-title">${esc(p.name)}</div>
        ${meta ? `<div class="rm-item-meta">${esc(meta)}</div>` : ""}
        ${p.description ? `<p class="rm-item-desc">${esc(p.description)}</p>` : ""}
        ${bullets(p.highlights)}
      </div>`;
    })
    .join("");
  const projects = section("Selected Work", projectsBody);

  // ---- experience ----
  const workBody = (jr.work || [])
    .map((w) => {
      const title = [w.position, w.name].filter(Boolean).join(" – ");
      const meta = [fmtRange(w.startDate, w.endDate), w.location].filter(Boolean).join("  ·  ");
      return `<div class="rm-item">
        <div class="rm-item-title">${esc(title)}</div>
        ${meta ? `<div class="rm-item-meta">${esc(meta)}</div>` : ""}
        ${w.summary ? `<p class="rm-item-desc">${esc(w.summary)}</p>` : ""}
        ${bullets(w.highlights)}
      </div>`;
    })
    .join("");
  const experience = section("Experience", workBody);

  // ---- skills (categories when keywords exist, else a single line) ----
  const skillCats = (jr.skills || []).filter((s) => (s.keywords || []).length);
  const skillFlat = (jr.skills || []).filter((s) => !(s.keywords || []).length).map((s) => s.name).filter(Boolean);
  let skillsBody = "";
  if (skillCats.length) {
    skillsBody += skillCats
      .map(
        (s) => `<div class="rm-skill-cat"><div class="rm-skill-name">${esc(s.name)}</div>
        <div class="rm-skill-list">${(s.keywords || []).map(esc).join(" · ")}</div></div>`,
      )
      .join("");
  }
  if (skillFlat.length) {
    skillsBody += `<div class="rm-skill-list rm-skill-line">${skillFlat.map(esc).join(" · ")}</div>`;
  }
  const skills = section("Skills", skillsBody);

  // ---- education (two columns) ----
  const eduBody = (jr.education || [])
    .map((e) => {
      const right = [e.institution, e.studyType].filter(Boolean);
      return `<div class="rm-edu-row">
        <div class="rm-edu-left">
          <div class="rm-item-title">${esc(e.area || e.studyType || "")}</div>
          ${(e.startDate || e.endDate) ? `<div class="rm-item-meta">${esc(fmtRange(e.startDate, e.endDate))}</div>` : ""}
        </div>
        <div class="rm-edu-right">
          ${e.institution ? `<div class="rm-edu-inst">${esc(e.institution)}</div>` : ""}
          ${e.studyType ? `<div class="rm-item-meta">${esc(e.studyType)}</div>` : ""}
        </div>
      </div>`;
    })
    .join("");
  const education = section("Education", eduBody);

  // ---- certificates ----
  const certBody = (jr.certificates || []).length
    ? `<ul class="rm-bullets">${(jr.certificates || [])
        .map((c) => {
          const tail = [c.issuer, fmtDate(c.date)].filter(Boolean).join(", ");
          return `<li><strong>${esc(c.name)}</strong>${tail ? ` – ${esc(tail)}` : ""}</li>`;
        })
        .join("")}</ul>`
    : "";
  const certificates = section("Certifications", certBody);

  // ---- awards ----
  const awardBody = (jr.awards || []).length
    ? `<ul class="rm-bullets">${(jr.awards || [])
        .map((a) => {
          const tail = [a.awarder, fmtDate(a.date)].filter(Boolean).join(", ");
          return `<li><strong>${esc(a.title)}</strong>${tail ? ` – ${esc(tail)}` : ""}${a.summary ? `<br>${esc(a.summary)}` : ""}</li>`;
        })
        .join("")}</ul>`
    : "";
  const awards = section("Awards", awardBody);

  // ---- languages ----
  const langBody = (jr.languages || []).length
    ? `<div class="rm-skill-list rm-skill-line">${(jr.languages || [])
        .map((l) => esc([l.language, l.fluency].filter(Boolean).join(" (") + (l.fluency ? ")" : "")))
        .join(" · ")}</div>`
    : "";
  const languages = section("Languages", langBody);

  const css = `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, "Liberation Sans", sans-serif;
      color: #232323; font-size: 11.2px; line-height: 1.55;
      padding: 46px 54px; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    a { color: inherit; text-decoration: none; }
    .rm-head { text-align: center; margin-bottom: 10px; }
    .rm-head h1 {
      margin: 0; font-weight: 300; font-size: 31px; letter-spacing: 1.5px;
      text-transform: uppercase; color: #1f1f1f;
    }
    .rm-subtitle { color: #7a7a7a; font-size: 14px; margin-top: 4px; }
    .rm-block { margin-top: 22px; }
    .rm-sec {
      margin: 0 0 12px; font-size: 12px; font-weight: 600; letter-spacing: 2px;
      text-transform: uppercase; color: #8c8c8c;
      border-bottom: 1px solid #e4e4e4; padding-bottom: 5px;
    }
    .rm-contact { display: flex; flex-wrap: wrap; gap: 6px 22px; color: #3a3a3a; }
    .rm-block p { margin: 0 0 9px; }
    .rm-item { margin-bottom: 15px; }
    .rm-item:last-child { margin-bottom: 0; }
    .rm-item-title { font-weight: 700; color: #1f1f1f; }
    .rm-item-title::before { content: "\\25AA"; color: #1f1f1f; margin-right: 8px; }
    .rm-item-meta { color: #8a8a8a; font-style: italic; font-size: 10.6px; margin-top: 2px; }
    .rm-item-desc { margin: 5px 0 0; }
    ul.rm-bullets { list-style: none; margin: 6px 0 0; padding: 0; }
    ul.rm-bullets li { position: relative; padding-left: 18px; margin-bottom: 5px; }
    ul.rm-bullets li::before {
      content: "\\25CF"; position: absolute; left: 2px; top: 0;
      font-size: 7px; line-height: 1.9; color: #555;
    }
    .rm-skill-cat { margin-bottom: 9px; }
    .rm-skill-name { font-weight: 700; color: #1f1f1f; }
    .rm-skill-list { color: #333; }
    .rm-skill-line { margin-top: 2px; }
    .rm-edu-row {
      display: flex; gap: 24px; margin-bottom: 13px; align-items: flex-start;
    }
    .rm-edu-left, .rm-edu-right { flex: 1 1 0; min-width: 0; }
    .rm-edu-inst { font-weight: 700; color: #1f1f1f; }
  `;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body>${header}${contact}${about}${projects}${experience}${skills}${education}${certificates}${awards}${languages}</body></html>`;
}
