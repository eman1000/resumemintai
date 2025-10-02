// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/ai';

export const runtime = 'nodejs';

// ------------------- helpers: text utils -------------------
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*';
const YEAR = '(?:19|20)\\d{2}';
const DATE_RANGE =
  `(?:${MONTH}\\s+${YEAR}|${YEAR})(?:\\s*[–-]\\s*(?:${MONTH}\\s+${YEAR}|${YEAR}|Present))?`;

const titleKeywords = /\b(Full\s*Stack|Front\s*End|Back\s*End|Software|Senior|Junior|Lead|Principal|Staff|Web|Mobile|iOS|Android|React|Angular|Node|Engineer|Developer|Designer|Manager|Architect)\b/i;

function linesOf(text: string) {
  return text
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function isDateLike(line: string) {
  return new RegExp(`^${DATE_RANGE}$`, 'i').test(line);
}

function isLikelyTitle(line: string) {
  // Title often includes one of the keywords; ignore all-caps single words etc.
  return titleKeywords.test(line) && line.length <= 80;
}

function isLikelyCompany(line: string) {
  // Company: capitalized words, maybe with Sdn Bhd, Ltd, Inc, (something)
  if (!/[a-z]/i.test(line)) return false;
  if (isDateLike(line)) return false;
  if (isLikelyTitle(line)) return false;
  // avoid headings like CONTACT / EXPERIENCE / EDUCATION
  if (/^(contact|experience|education|about|summary|skills)\b/i.test(line)) return false;
  return line.length <= 100;
}

// ------------------- heuristics: experience -------------------
type HeuExp = { role: string; company?: string; start?: string; end?: string; bullets: string[]; location?: string };

function heuristicExperience(raw: string): HeuExp[] {
  const L = linesOf(raw);
  const exps: HeuExp[] = [];
  let i = 0;

  while (i < L.length) {
    const line = L[i];

    if (isLikelyTitle(line)) {
      const role = line.replace(/\s*\(.*?\)\s*/g, '').trim(); // drop (Remote), etc.
      let start: string | undefined;
      let end: string | undefined;
      let company: string | undefined;
      let location: string | undefined;

      // lookahead a few lines for date / company
      let j = i + 1;
      for (let k = 0; k < 4 && j + k < L.length; k++) {
        const pick = L[j + k];
        if (!start && isDateLike(pick)) {
          // split into start/end if present
          const m = pick.match(new RegExp(`^(${MONTH}\\s+${YEAR}|${YEAR})(?:\\s*[–-]\\s*(${MONTH}\\s+${YEAR}|${YEAR}|Present))?$`, 'i'));
          if (m) {
            start = m[1];
            end = m[2] || undefined;
          } else {
            start = pick;
          }
        } else if (!company && isLikelyCompany(pick)) {
          company = pick;
        } else if (!location && /[A-Za-z]+,\s*[A-Za-z]+/.test(pick)) {
          location = pick;
        }
      }

      // advance to first bullet/content line
      i++;
      while (i < L.length && (isDateLike(L[i]) || L[i] === company || L[i] === location)) i++;

      // capture bullets/paragraphs until next title or blank break of two lines
      const bullets: string[] = [];
      while (i < L.length) {
        const ln = L[i];
        if (isLikelyTitle(ln)) break;
        if (/^(experience|education|skills|about|summary)\b/i.test(ln)) break;
        // treat plain sentences as bullets too
        if (ln) bullets.push(ln.replace(/^[•\-\u2022]\s*/, '').trim());
        i++;
      }

      exps.push({ role, company, start, end, bullets, location });
      continue; // skip i++ because we already advanced
    }

    i++;
  }

  // de-dup + basic cleanup
  return exps.filter(e => e.role || e.company || e.bullets.length);
}

// ------------------- heuristics: education -------------------
type HeuEdu = { degree: string; school?: string; location?: string; dates?: string; notes?: string[] };

function heuristicEducation(raw: string): HeuEdu[] {
  // try to slice the EDUCATION block
  const parts = raw.split(/(?:^|\n)\s*EDUCATION\s*(?:\n|$)/i);
  const eduText = parts.length > 1 ? parts.slice(1).join('\n') : raw;

  const L = linesOf(eduText);
  const out: HeuEdu[] = [];

  let i = 0;
  while (i < L.length) {
    const ln = L[i];

    const looksLikeDegree = /(Bachelor|Master|B\.?Sc|M\.?Sc|Bachelors|Masters|Diploma|Certificate)/i.test(ln);
    if (looksLikeDegree) {
      const degree = ln;
      let dates: string | undefined;
      let school: string | undefined;
      let location: string | undefined;
      const notes: string[] = [];

      // Examine next few lines
      let j = i + 1;
      for (let k = 0; k < 5 && j + k < L.length; k++) {
        const pick = L[j + k];
        if (!dates && new RegExp(DATE_RANGE, 'i').test(pick)) {
          dates = pick;
        } else if (!school && /[A-Za-z]/.test(pick) && !/^(projects?|skills?|experience)\b/i.test(pick)) {
          if (!isDateLike(pick)) {
            // likely school OR location line(s)
            if (!school) school = pick;
            else if (!location) location = pick;
            else notes.push(pick);
          }
        }
      }

      out.push({ degree, school, location, dates, notes });
      i += 2;
      continue;
    }

    i++;
  }
  return out;
}

// ------------------- hints for the model -------------------
function buildHints(text: string) {
  const exps = heuristicExperience(text);
  const edus = heuristicEducation(text);

  // Pull distinct lists for the model
  const roles = Array.from(new Set(exps.map(e => e.role).filter(Boolean)));
  const companies = Array.from(new Set(exps.map(e => e.company).filter(Boolean)));
  const dateRanges = Array.from(
    new Set(
      linesOf(text).filter(isDateLike)
    )
  );

  return {
    rolesDetected: roles,
    companiesDetected: companies,
    dateRangesDetected: dateRanges,
    heuristicExperience: exps,
    heuristicEducation: edus,
  };
}

// ------------------- JSON Schema (strict) -------------------
const RESUME_JSON_SCHEMA = {
  name: 'ResumeOutput',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      contact: {
        type: 'object',
        additionalProperties: false,
        properties: {
          email: { type: 'string' },
          phone: { type: 'string' },
          website: { type: 'string' },
          location: { type: 'string' },
        },
      },
      summary: { type: 'string' },
      skills: {
        type: 'object',
        additionalProperties: false,
        properties: {
          core:  { type: 'array', items: { type: 'string' } },
          tools: { type: 'array', items: { type: 'string' } },
          soft:  { type: 'array', items: { type: 'string' } },
        },
        required: ['core', 'tools', 'soft'],
      },
      experience: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            role:     { type: 'string' },
            company:  { type: 'string' },
            location: { type: 'string' },
            start:    { type: 'string' },
            end:      { type: 'string' },
            bullets:  { type: 'array', items: { type: 'string' } },
          },
          required: ['role', 'bullets'],
        },
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            degree: { type: 'string' },
            school: { type: 'string' },
            location: { type: 'string' },
            dates:  { type: 'string' },
            notes:  { type: 'array', items: { type: 'string' } },
          },
          required: ['degree', 'school'],
        },
      },
      achievements: { type: 'array', items: { type: 'string' } },
      keywords:     { type: 'array', items: { type: 'string' } },
      ats_notes:    { type: 'array', items: { type: 'string' } },
      languages: { type: 'array', items: { type: 'string' } },
      references: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name:    { type: 'string' },
            title:   { type: 'string' },
            company: { type: 'string' },
            phone:   { type: 'string' },
            email:   { type: 'string' },
          },
          required: ['name'],
        },
      }
    },
    required: [
      'summary',
      'skills',
      'experience',
      'education',
      'achievements',
      'keywords',
      'ats_notes'
    ],
  },
};

// ------------------- system prompt -------------------
const SYS = `You are a resume parser/tailor. You receive raw resume text and helpful "hints" extracted by regex.
Return ONE JSON object that matches the schema exactly.
Parsing rules:
- Use headings (EXPERIENCE, EDUCATION, SKILLS, ABOUT/SUMMARY) when present.
- If dates/roles/companies are on separate lines, align them using order and proximity.
- Dates: normalize to "Mon YYYY" or "YYYY" and "Present".
- Do not invent facts; if unknown, use "" or [] as appropriate.
- Experience bullets should be crisp, outcome-driven (metrics where provided).
- Prefer the hints when they clearly match the text; otherwise defer to the raw text.
- If the resume lists LANGUAGES, return them as an array of strings in "languages".
- If the resume lists REFERENCES, return them as an array of objects with name, title, company, phone, email (use "" when unknown).

`;

// ------------------- normalization + merge with heuristics -------------------
function arr<T = string>(v: any): T[] { return Array.isArray(v) ? v : []; }
function str(v: any): string { return typeof v === 'string' ? v : ''; }
function isContactish(s: string) {
  return /\b(contact|email|e-mail|phone|tel|address)\b/i.test(s)
      || /@/.test(s)
      || /https?:\/\//i.test(s)
      || /\+?\d[\d()\s.\-]{7,}/.test(s);
}
function normalize(res: any) {
  const out: any = {
    name: str(res?.name),
    contact: {
      email: str(res?.contact?.email),
      phone: str(res?.contact?.phone),
      website: str(res?.contact?.website),
      location: str(res?.contact?.location),
    },
    summary: str(res?.summary),

    skills: {
      core:  arr(res?.skills?.core),
      tools: arr(res?.skills?.tools),
      soft:  arr(res?.skills?.soft),
    },

  experience: arr(res?.experience).map((e: any) => {
    const bullets = arr(e?.bullets).map(str).filter(b => !isContactish(b));
    return {
      role: str(e?.role),
      company: str(e?.company),
      location: str(e?.location),
      start: str(e?.start),
      end: str(e?.end),
      bullets,
    };
  }).filter((e:any) => e.role || e.company || (e.bullets && e.bullets.length)),

    education: arr(res?.education).map((ed: any) => ({
      degree: str(ed?.degree),
      school: str(ed?.school),
      location: str(ed?.location),
      dates: str(ed?.dates),
      notes: arr(ed?.notes).map(str),
    })),

    achievements: arr(res?.achievements).map(str),
    keywords: arr(res?.keywords).map(str),
    ats_notes: arr(res?.ats_notes).map(str),
    languages: arr(res?.languages).map(str),
    references: arr(res?.references).map((r: any) => ({
      name:    str(r?.name),
      title:   str(r?.title),
      company: str(r?.company),
      phone:   str(r?.phone),
      email:   str(r?.email),
    })),

  };

  // Ensure arrays exist
  out.experience   = arr(out.experience);
  out.education    = arr(out.education);
  out.achievements = arr(out.achievements);
  out.keywords     = arr(out.keywords);
  out.ats_notes    = arr(out.ats_notes);

  out.skills.core  = arr(out.skills.core);
  out.skills.tools = arr(out.skills.tools);
  out.skills.soft  = arr(out.skills.soft);

  out.languages  = arr(out.languages);
  out.references = arr(out.references);


  return out;
}

// Fill empty role/company/date from heuristics if missing
function mergeWithHeuristics(json: any, hints: ReturnType<typeof buildHints>) {
  const out = { ...json };

  // Experience: try to patch empties in order
  const heu = hints.heuristicExperience;
  if (heu.length) {
    // ensure the array exists
    out.experience = Array.isArray(out.experience) ? out.experience : [];
    // Grow or patch each slot
    for (let i = 0; i < heu.length; i++) {
      if (!out.experience[i]) out.experience[i] = { role: '', bullets: [] };
      const t = out.experience[i];
      const h = heu[i];

      t.role     = t.role     || h.role || '';
      t.company  = t.company  || h.company || '';
      t.location = t.location || h.location || '';
      t.start    = t.start    || h.start || '';
      t.end      = t.end      || h.end || '';
      if (!Array.isArray(t.bullets) || t.bullets.length === 0) {
        t.bullets = h.bullets || [];
      }
    }
  }

  // Education: patch similarly
  const hedu = hints.heuristicEducation;
  if (hedu.length) {
    out.education = Array.isArray(out.education) ? out.education : [];
    for (let i = 0; i < hedu.length; i++) {
      if (!out.education[i]) out.education[i] = { degree: '', school: '', notes: [] };
      const t = out.education[i];
      const h = hedu[i];

      t.degree   = t.degree   || h.degree || '';
      t.school   = t.school   || h.school || '';
      t.location = t.location || h.location || '';
      t.dates    = t.dates    || h.dates || '';
      if (!Array.isArray(t.notes) || t.notes.length === 0) {
        t.notes = h.notes || [];
      }
    }
  }

  return out;
}
function scrapeLanguages(src: string): string[] {
  const block = (src.split(/LANGUAGES?/i)[1] || '').split(/\n[A-Z ]{3,}\n/)[0] || '';
  return Array.from(new Set(
    block.split(/[\n,;•]+/).map(s => s.trim()).filter(Boolean)
  ));
}

function scrapeReferences(src: string) {
  const block = (src.split(/REFERENCES?/i)[1] || '').split(/\n[A-Z ]{3,}\n/)[0] || '';
  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const refs:any[] = [];
  for (let i=0; i<lines.length; i+=2) {
    const a = lines[i] || '';
    const b = lines[i+1] || '';

    // "Name — Title, Company"
    let name = a.replace(/[-–—].*$/, '').trim();
    let rest = (a.includes('—') || a.includes('-')) ? a.split(/[-–—]/).slice(1).join(' ').trim() : '';
    let title = rest.replace(/,.*$/, '').trim();
    let company = (rest.match(/,(.*)$/)?.[1] || '').trim();

    const phone = (a + ' ' + b).match(/(?:\+?\d[\d\s\-()]{7,})/)?.[0] || '';
    const email = (a + ' ' + b).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';

    if (name) refs.push({ name, title, company, phone, email });
  }
  return refs;
}

// ------------------- route -------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText = '', jobDescription = '', role = '', seniority = '', tone = '' } = body || {};

    if (!resumeText || resumeText.length < 30) {
      return NextResponse.json({ error: 'Please provide resumeText (30+ chars).' }, { status: 400 });
    }

    // Build hints for the model and fallback
    const hints = buildHints(resumeText);

    const userMsg =
      `RAW RESUME TEXT:\n${resumeText}\n\n` +
      `JOB DESCRIPTION (optional):\n${jobDescription || '(none)'}\n\n` +
      `TARGET ROLE: ${role || '(none)'}\nSENIORITY: ${seniority || '(none)'}\nTONE: ${tone || 'professional'}\n\n` +
      `HINTS (extracted by regex/heuristics):\n` +
      `- rolesDetected: ${JSON.stringify(hints.rolesDetected)}\n` +
      `- companiesDetected: ${JSON.stringify(hints.companiesDetected)}\n` +
      `- dateRangesDetected: ${JSON.stringify(hints.dateRangesDetected)}\n` +
      `- heuristicExperience: ${JSON.stringify(hints.heuristicExperience)}\n` +
      `- heuristicEducation: ${JSON.stringify(hints.heuristicEducation)}\n\n` +
      `Return a single JSON object conforming to the provided JSON Schema.`;

    // Try strict json_schema; fallback to json_object if needed
    let content: string | undefined;
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_schema', json_schema: { ...RESUME_JSON_SCHEMA, strict: true } } as any,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: userMsg },
        ],
      });
      content = resp.choices?.[0]?.message?.content || '{}';
    } catch {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYS + '\nAlways include every key from the schema; use empty arrays/strings if unknown.' },
          { role: 'user', content: userMsg },
        ],
      });
      content = resp.choices?.[0]?.message?.content || '{}';
    }

    // Normalize + patch with heuristics where missing
    const raw = JSON.parse(content);
    const normalized = normalize(raw);
    const merged = mergeWithHeuristics(normalized, hints);
    if (!merged.languages?.length) {
      merged.languages = scrapeLanguages(resumeText);
    }
    if (!merged.references?.length) {
      merged.references = scrapeReferences(resumeText);
    }

    // Ensure summary: if empty, synthesize from ABOUT/first paragraph
    if (!merged.summary) {
      const about = (resumeText.match(/(?:ABOUT|SUMMARY)\s*([\s\S]+?)(?:\n[A-Z ]{3,}|$)/i)?.[1] || '').trim();
      merged.summary = about.slice(0, 800);
    }

    // Skills fallback: scrape from SKILLS section if model left empty
    if (merged.skills.core.length + merged.skills.tools.length + merged.skills.soft.length === 0) {
      const skillsBlock = (resumeText.split(/SKILLS/i)[1] || '').split(/\n[A-Z ]{3,}\n/)[0] || '';
      const buckets = {
        core: [] as string[],
        tools: [] as string[],
        soft: [] as string[],
      };
      // Naive split by commas/semicolons/lines
      // @ts-ignore
      skillsBlock.split(/[\n,;]+/).forEach(s => {
        const t = s.trim();
        if (!t) return;
        if (/leadership|communication|team|emotional|management|agile|stakeholder/i.test(t)) buckets.soft.push(t);
        else if (/react|node|angular|typescript|sass|redux|php|mysql|aws|swift|android|web3|api|rest|postgres/i.test(t)) buckets.tools.push(t);
        else buckets.core.push(t);
      });
      merged.skills = {
        core: Array.from(new Set(buckets.core)),
        tools: Array.from(new Set(buckets.tools)),
        soft: Array.from(new Set(buckets.soft)),
      };
    }

    return NextResponse.json(merged);
  } catch (err: any) {
    console.error('[generate] ERROR', err);
    return NextResponse.json({ error: err?.message || 'unexpected error' }, { status: 500 });
  }
}
