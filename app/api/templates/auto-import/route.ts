// app/api/templates/auto-import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import DOMPurify from 'isomorphic-dompurify';
import { parseHTML } from 'linkedom';

// Optional Firestore save:
// import { db } from '@/app/firebase';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = (formData.get('name') as string) || 'Imported (Auto)';

  if (!file) return NextResponse.json({ error: 'file missing' }, { status: 400 });

  // 1) DOCX → HTML
  const buf = Buffer.from(await file.arrayBuffer());
  const { value: rawHtml } = await mammoth.convertToHtml({ buffer: buf }, {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
    ],
  });

  // 2) Sanitize & tag
  const clean = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  const tagged = autoTagTemplate(clean);

  // Optional: Save to Firestore
  // const ref = await addDoc(collection(db, 'templates'), {
  //   name, html: tagged, createdAt: serverTimestamp()
  // });

  return NextResponse.json({ id: null, name, html: tagged });
}

/** Heuristic auto-tagging of common resume sections and table-repeat markers */
function autoTagTemplate(html: string): string {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const body = document.body;

  // helpers
  const textOf = (el: Element | null) => (el?.textContent || '').trim();
  const findHeading = (...labels: string[]) => {
    const els = Array.from(body.querySelectorAll('h1,h2,h3,strong,b,p'));
    const cand = els.find(el => {
      const t = textOf(el).toLowerCase().replace(/\s+/g, ' ');
      return labels.some(l => t === l.toLowerCase());
    });
    return cand || null;
  };
  const nextBlock = (el: Element | null) => {
    if (!el) return null;
    let n = el.nextElementSibling;
    while (n && !isBlock(n.tagName)) n = n.nextElementSibling;
    return n;
  };
  const isBlock = (tag: string) => /^(P|DIV|UL|OL|TABLE|SECTION|ARTICLE|H\d)$/.test(tag);

  // 1) CONTACT
  const contactH = findHeading('contact', 'contacts', 'contact info', 'contact information');
  const contactTarget = nextBlock(contactH);
  if (contactTarget) {
    // render separate lines; keep simple and ATS-safe
    contactTarget.innerHTML = [
      '{{phone}}',
      '{{email}}',
      '{{website}}',
      '{{location}}'
    ].join('<br/>');
  }

  // 2) ABOUT / SUMMARY
  const aboutH = findHeading('about', 'summary', 'professional summary', 'profile', 'about me');
  const aboutTarget = nextBlock(aboutH);
  if (aboutTarget) {
    aboutTarget.innerHTML = '{{summary}}';
  }

  // 3) EXPERIENCE
  const expH = findHeading('experience', 'work experience', 'professional experience');
  if (expH) {
    const expBlock = nextBlock(expH);
    if (expBlock?.tagName === 'TABLE') {
      tagExperienceTable(expBlock);
    } else {
      // Non-table fallback: create a simple block loop
      // Replace following paragraph/div with a generic looped block if present
      if (expBlock) {
        expBlock.innerHTML = `
{{#experience}}
<p><strong>{{role}}{{#company}} — {{company}}{{/company}}</strong></p>
<p>{{#bullets}}• {{.}}<br/>{{/bullets}}</p>
{{/experience}}`.trim();
      }
    }
  }

  // 4) EDUCATION
  const eduH = findHeading('education', 'educational background', 'academics');
  const eduBlock = nextBlock(eduH);
  if (eduBlock?.tagName === 'TABLE') {
    tagEducationTable(eduBlock);
  } else if (eduBlock) {
    eduBlock.innerHTML = `
{{#education}}
<p><strong>{{degree}}</strong></p>
<p>{{school}}</p>
<p>{{dates}}</p>
{{#notes}}<p>• {{.}}</p>{{/notes}}
{{/education}}`.trim();
  }

  // 5) SKILLS (map to core/tools/soft)
  const skillsH = findHeading('skills', 'technical skills', 'technical expertise', 'other skills');
  const skillsBlock = nextBlock(skillsH);
  if (skillsBlock) {
    skillsBlock.innerHTML = `
<p><strong>Core:</strong> {{#skills.core}}{{.}}{{^last}}, {{/last}}{{/skills.core}}</p>
<p><strong>Tools:</strong> {{#skills.tools}}{{.}}{{^last}}, {{/last}}{{/skills.tools}}</p>
<p><strong>Soft:</strong> {{#skills.soft}}{{.}}{{^last}}, {{/last}}{{/skills.soft}}</p>
`.trim();
  }

  // return final HTML
  return body.innerHTML;
}

/** Tag the first data row of an EXPERIENCE table to repeat per job */
function tagExperienceTable(table: Element) {
  const tbody = table.querySelector('tbody') || table;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (!rows.length) return;

  // Choose first non-header row (skip <th>)
  const row = rows.find(r => !r.querySelector('th')) || rows[0];

  // Add [[repeat:experience]] marker in the first cell (creates the "template row")
  const firstCell = row.querySelector('td,th');
  if (firstCell) {
    firstCell.textContent = `${(firstCell.textContent || '').trim()} [[repeat:experience]]`;
  }

  // Heuristically assign cells: role/company, dates, bullets
  const cells = Array.from(row.querySelectorAll('td,th'));
  if (!cells.length) return;

  // Cell 0: role/company
  cells[0].innerHTML = `{{role}}{{#company}} — {{company}}{{/company}}`;

  // Try to find a bullets cell (UL/paragraphs) else use last cell
  let bulletsCell = cells.find(c => c.querySelector('ul,ol,p')) || cells[cells.length - 1];
  bulletsCell.innerHTML = `• [[repeat:bullets]] {{.}}`;

  // If there is a "dates" looking cell (YYYY or month), set it to {{dates}}
  const dateCell = cells.find(c => /\b(20\d{2}|19\d{2})\b/.test((c.textContent || '')));
  if (dateCell && dateCell !== bulletsCell && dateCell !== cells[0]) {
    dateCell.innerHTML = `{{dates}}`;
  }
}

/** Tag the first data row of an EDUCATION table to repeat per entry */
function tagEducationTable(table: Element) {
  const tbody = table.querySelector('tbody') || table;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (!rows.length) return;

  const row = rows.find(r => !r.querySelector('th')) || rows[0];
  const firstCell = row.querySelector('td,th');
  if (firstCell) {
    firstCell.textContent = `${(firstCell.textContent || '').trim()} [[repeat:education]]`;
  }

  const cells = Array.from(row.querySelectorAll('td,th'));
  if (!cells.length) return;

  // Heuristics: first cell degree, second school, third dates (if present)
  if (cells[0]) cells[0].innerHTML = `{{degree}}`;
  if (cells[1]) cells[1].innerHTML = `{{school}}`;
  const dateCell = cells[2] || cells.find(c => /\b(20\d{2}|19\d{2})\b/.test((c.textContent || '')));
  if (dateCell) dateCell.innerHTML = `{{dates}}`;
}
