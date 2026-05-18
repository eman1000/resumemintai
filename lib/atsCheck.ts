// lib/atsCheck.ts
//
// Deterministic deep ATS audit. No AI calls — score, per-category breakdown,
// and per-check verdicts are derived from pattern matching + heuristics that
// mirror what an ATS would do. Every check is free; there is no paywall.

const STOPWORDS = new Set<string>([
  'a','an','and','or','the','of','to','in','for','on','with','as','is','are','was','were','be','been',
  'being','by','at','from','that','this','these','those','it','its','our','your','their','we','you','they',
  'will','can','should','must','may','have','has','had','do','does','did','not','no','if','then','than',
  'about','into','out','up','down','over','under','also','etc','very','more','most','less','least',
  'who','what','which','where','when','why','how','any','some','all','each','every','other','another',
  'new','great','strong','excellent','good','best','top','high','low','able','willing','required',
  'preferred','plus','years','year','experience','work','working','job','role','team','teams','company',
  'companies','position','positions','opportunity','opportunities','responsibilities','responsible',
  'qualifications','candidate','candidates','requirements','requirement','please','etc','via','using',
  'use','used','help','helps','helping','make','makes','making','build','builds','building','ensure',
  'ensures','provide','provides','provided','include','includes','including','across','within','among',
  'between','during','through','around','due','i','me','my','mine','him','her','his','hers','them',
]);

const ACTION_VERBS = new Set<string>([
  'led','built','shipped','designed','developed','launched','owned','drove','grew','reduced','cut',
  'improved','increased','decreased','automated','migrated','refactored','scaled','delivered',
  'managed','mentored','hired','onboarded','optimized','optimised','architected','implemented','created',
  'authored','negotiated','partnered','collaborated','presented','researched','analyzed','analysed',
  'tested','deployed','released','rebuilt','redesigned','transformed','established','founded','introduced',
  'spearheaded','championed','executed','operated','sourced','recruited','trained','coached','reviewed',
  'investigated','prototyped','validated','benchmarked','streamlined','consolidated',
]);

const LEADERSHIP_KEYWORDS = [
  'led','managed','mentored','hired','supervised','directed','oversaw','spearheaded','chaired','headed',
];

const COMMON_TYPOS: Array<[RegExp, string]> = [
  [/\bteh\b/gi, 'the'],
  [/\brecieve(d|s|r)?\b/gi, 'receive'],
  [/\bseperat(e|ed|es|ing|ion)\b/gi, 'separate'],
  [/\boccured\b/gi, 'occurred'],
  [/\bdefinately\b/gi, 'definitely'],
  [/\baccomodate(d|s|ing)?\b/gi, 'accommodate'],
  [/\bcommited\b/gi, 'committed'],
  [/\bunfortunatly\b/gi, 'unfortunately'],
  [/\bproffesional\b/gi, 'professional'],
  [/\bsucessfull?y?\b/gi, 'successfully'],
  [/\bachievment(s)?\b/gi, 'achievement'],
  [/\bmanagment\b/gi, 'management'],
  [/\benviroment\b/gi, 'environment'],
  [/\bbenificial\b/gi, 'beneficial'],
  [/\bresponsability\b/gi, 'responsibility'],
];

const DISCRIMINATION_PATTERNS: Array<[RegExp, string]> = [
  [/\b(age|date of birth|birthdate|dob)\s*[:\-]/gi, 'Age / birthdate'],
  [/\b(married|single|divorced|widowed)\b/gi, 'Marital status'],
  [/\b(catholic|protestant|christian|muslim|jewish|hindu|buddhist|atheist)\b/gi, 'Religious affiliation'],
  [/\bnationality\s*[:\-]/gi, 'Nationality'],
  [/\bphoto\s*[:\-]/gi, 'Photo label'],
];

const FORMATTING_HOSTILE = [
  { rx: /\|/g, label: 'Pipe characters (|) — some ATS treat them as field separators.' },
  { rx: /\t/g, label: 'Tab characters — use plain spaces.' },
  { rx: /[\u2028\u2029]/g, label: 'Line-separator unicode characters.' },
  { rx: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, label: 'Emojis / decorative symbols — strip them for ATS safety.' },
];

const PHONE_RX = /(\+?\d[\s().-]?){7,}/;
const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RX = /\b(https?:\/\/|www\.|[a-z0-9-]+\.)[^\s]+\.(com|net|org|io|dev|design|co|app|me|so)\b/i;
const BULLET_RX = /(^|\n)[\s•·\-\*]\s+/;
const NUMERIC_IMPACT_RX = /(\d+(?:[.,]\d+)?%|\d+(?:[.,]\d+)?[kKmMbB]\+?|\$\s?\d|€\s?\d|£\s?\d|\b\d{2,}\b)/;

const SECTION_HEADINGS: Record<string, RegExp> = {
  summary:    /^\s*(summary|profile|objective|about|overview)\b/im,
  experience: /^\s*(experience|employment|work history|professional experience|career)\b/im,
  education:  /^\s*(education|academic background|studies)\b/im,
  skills:     /^\s*(skills|technical skills|core competencies|technologies)\b/im,
};

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function getBullets(text: string): string[] {
  return String(text || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /^[•·\-\*]\s+/.test(l))
    .map((l) => l.replace(/^[•·\-\*]\s+/, ''));
}

function extractDateRanges(text: string): Array<{ startYear: number; endYear: number; isPresent: boolean }> {
  const rx = /\b(?:[A-Za-z]{3,9}\s+)?(\d{4})\s*[-–—to]+\s*(?:[A-Za-z]{3,9}\s+)?(\d{4}|present|current|now)/gi;
  const out: Array<{ startYear: number; endYear: number; isPresent: boolean }> = [];
  const thisYear = new Date().getFullYear();
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text))) {
    const start = parseInt(m[1], 10);
    const endRaw = String(m[2] || '').toLowerCase();
    const isPresent = /present|current|now/.test(endRaw);
    const end = isPresent ? thisYear : parseInt(endRaw, 10);
    if (start && end && end >= start && start > 1950 && end <= thisYear + 1) {
      out.push({ startYear: start, endYear: end, isPresent });
    }
  }
  return out;
}

// ---- keyword extraction (JD) --------------------------------------------

export function extractKeywords(jd: string): string[] {
  const tokens = tokenize(jd);
  if (!tokens.length) return [];
  const out = new Set<string>();
  for (const tok of tokens) {
    if (tok.length < 2) continue;
    if (STOPWORDS.has(tok)) continue;
    if (/^\d+$/.test(tok)) continue;
    out.add(tok);
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    if (a.length < 2 || b.length < 2) continue;
    out.add(`${a} ${b}`);
  }
  for (let i = 0; i < tokens.length - 2; i++) {
    const a = tokens[i], b = tokens[i + 1], c = tokens[i + 2];
    if (STOPWORDS.has(a) || STOPWORDS.has(b) || STOPWORDS.has(c)) continue;
    if (a.length < 2 || b.length < 2 || c.length < 2) continue;
    out.add(`${a} ${b} ${c}`);
  }
  return Array.from(out).sort((x, y) => y.length - x.length || x.localeCompare(y));
}

// ---- result types -------------------------------------------------------

export type CheckStatus = 'pass' | 'warn' | 'fail';

export type Check = {
  id: string;
  name: string;
  status: CheckStatus;
  summary: string;
  fixHint?: string;
  evidence?: string[];
  score: number; // 0..1
};

export type Category = {
  id: string;
  name: string;
  description: string;
  scorePercent: number;
  weight: number;
  issueCount: number;
  checks: Check[];
  // Convenience for the Tailoring category — populated by checkResumeAgainstJob.
  keywords?: { total: number; matched: string[]; missing: string[]; rate: number };
};

export type AtsCheckResult = {
  score: number;
  band: 'low' | 'fair' | 'good' | 'excellent';
  resumeWordCount: number;
  // Kept at top-level for convenience.
  keywords: { total: number; matched: string[]; missing: string[]; rate: number };
  categories: Category[];
};

function bandFor(score: number): AtsCheckResult['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'low';
}

function pass(id: string, name: string, summary: string, fixHint?: string): Check {
  return { id, name, status: 'pass', summary, fixHint, score: 1 };
}
function warn(id: string, name: string, summary: string, fixHint?: string, evidence?: string[]): Check {
  return { id, name, status: 'warn', summary, fixHint, evidence, score: 0.5 };
}
function fail(id: string, name: string, summary: string, fixHint?: string, evidence?: string[]): Check {
  return { id, name, status: 'fail', summary, fixHint, evidence, score: 0 };
}

function makeCategory(id: string, name: string, description: string, weight: number, checks: Check[]): Category {
  const total = checks.length || 1;
  const sum = checks.reduce((s, c) => s + c.score, 0);
  const scorePercent = Math.round((sum / total) * 100);
  const issueCount = checks.filter((c) => c.status !== 'pass').length;
  return { id, name, description, weight, scorePercent, issueCount, checks };
}

// ---- categories ---------------------------------------------------------

function categoryContent(resume: string): Category {
  const checks: Check[] = [];
  const bullets = getBullets(resume);
  const words = tokenize(resume);

  const recognised = words.filter((w) => /^[a-z0-9+#.\-]+$/.test(w)).length;
  const parseRate = Math.min(1, recognised / Math.max(1, words.length));
  if (parseRate >= 0.92) checks.push(pass('ats_parse_rate', 'ATS Parse Rate', `Your resume parses cleanly (${Math.round(parseRate * 100)}%).`));
  else if (parseRate >= 0.8) checks.push(warn('ats_parse_rate', 'ATS Parse Rate', `Parse rate ${Math.round(parseRate * 100)}% — some content may be missed by ATS.`, 'Remove unusual characters, columns and decorative bullets.'));
  else checks.push(fail('ats_parse_rate', 'ATS Parse Rate', `Parse rate only ${Math.round(parseRate * 100)}%.`, 'Use a single-column layout and standard bullets.'));

  if (bullets.length) {
    const quantified = bullets.filter((b) => NUMERIC_IMPACT_RX.test(b)).length;
    const rate = quantified / bullets.length;
    if (rate >= 0.5) checks.push(pass('quantifying_impact', 'Quantifying Impact', `${quantified} of ${bullets.length} bullets include measurable numbers.`));
    else if (rate >= 0.25) checks.push(warn('quantifying_impact', 'Quantifying Impact', `Only ${quantified} of ${bullets.length} bullets have measurable impact.`, 'Add concrete numbers: % uplift, $ saved, users reached, time reduced.'));
    else checks.push(fail('quantifying_impact', 'Quantifying Impact', `Just ${quantified} of ${bullets.length} bullets show measurable impact.`, 'Recruiters scan for numbers. Quantify outcomes wherever you honestly can.'));
  } else {
    checks.push(fail('quantifying_impact', 'Quantifying Impact', 'No bullet points detected.', 'Structure work experience as bullets — easier to parse and to quantify.'));
  }

  const freq = new Map<string, number>();
  for (const w of words) if (w.length > 3 && !STOPWORDS.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const repeats = Array.from(freq.entries()).filter(([_, n]) => n >= 6).map(([w, n]) => `${w} (${n}×)`);
  if (repeats.length === 0) checks.push(pass('repetition', 'Repetition', 'No words are over-used.'));
  else if (repeats.length <= 2) checks.push(warn('repetition', 'Repetition', `${repeats.length} word(s) repeat heavily.`, 'Replace with synonyms or restructure the bullet.', repeats));
  else checks.push(fail('repetition', 'Repetition', `${repeats.length} repeated words detected.`, 'Vary your vocabulary — ATS and recruiters dock heavily repetitive language.', repeats));

  const typos = COMMON_TYPOS
    .map(([rx, fix]) => ({ rx, fix, matches: Array.from(resume.matchAll(rx)).map((m) => m[0]) }))
    .filter((t) => t.matches.length > 0);
  if (typos.length === 0) checks.push(pass('spelling_grammar', 'Spelling & Grammar', 'No common typos detected.'));
  else {
    const ev = typos.flatMap((t) => t.matches.slice(0, 3).map((m) => `"${m}" → "${t.fix}"`));
    checks.push(fail('spelling_grammar', 'Spelling & Grammar', `${ev.length} likely typo(s) found.`, 'Fix the typos and run a final spell-check before applying.', ev.slice(0, 8)));
  }

  if (bullets.length >= 3) {
    const verbStarts = bullets.filter((b) => {
      const first = (b.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
      return ACTION_VERBS.has(first) || ACTION_VERBS.has(first.replace(/(ed|ing|s)$/, ''));
    }).length;
    const rate = verbStarts / bullets.length;
    if (rate >= 0.7) checks.push(pass('bullets_consistency', 'Bullet Consistency', `${verbStarts}/${bullets.length} bullets start with strong action verbs.`));
    else checks.push(warn('bullets_consistency', 'Bullet Consistency', `${verbStarts}/${bullets.length} bullets lead with action verbs.`, 'Start each bullet with a strong verb (Led, Built, Shipped, Reduced, Grew…).'));
  } else {
    checks.push(warn('bullets_consistency', 'Bullet Consistency', 'Not enough bullets to assess consistency.', 'Aim for 3–6 bullets per role.'));
  }

  return makeCategory('content', 'Content', 'How well your writing reads to both ATS and humans.', 1.5, checks);
}

function categorySections(resume: string): Category {
  const checks: Check[] = [];
  const have = (k: keyof typeof SECTION_HEADINGS) => SECTION_HEADINGS[k].test(resume);

  checks.push(have('summary')
    ? pass('section_summary', 'Summary / Profile', 'A summary section is present.')
    : warn('section_summary', 'Summary / Profile', 'No summary section detected.', 'Add a 2–3 line "Summary" or "Profile" at the top.'));

  checks.push(have('experience')
    ? pass('section_experience', 'Experience', 'Work experience section detected.')
    : fail('section_experience', 'Experience', 'No experience section detected.', 'Add an "Experience" section with role / company / dates.'));

  checks.push(have('education')
    ? pass('section_education', 'Education', 'Education section detected.')
    : warn('section_education', 'Education', 'No education section detected.', 'Add an "Education" section — even one line.'));

  checks.push(have('skills')
    ? pass('section_skills', 'Skills', 'Skills section detected.')
    : warn('section_skills', 'Skills', 'No skills section detected.', 'Add a "Skills" section with the tools / technologies you use.'));

  return makeCategory('sections', 'Sections', 'Are the standard resume sections all there?', 1.0, checks);
}

function categoryAtsEssentials(resume: string): Category {
  const checks: Check[] = [];

  checks.push(EMAIL_RX.test(resume)
    ? pass('contact_email', 'Email address', 'Email address present.')
    : fail('contact_email', 'Email address', 'No email address found.', 'Add a personal email at the top of the resume.'));

  checks.push(PHONE_RX.test(resume)
    ? pass('contact_phone', 'Phone number', 'Phone number present.')
    : warn('contact_phone', 'Phone number', 'No phone number found.', 'Add a phone number with country code, e.g. +1 415 555 0142.'));

  checks.push(URL_RX.test(resume)
    ? pass('contact_link', 'LinkedIn / portfolio', 'A web link is present.')
    : warn('contact_link', 'LinkedIn / portfolio', 'No LinkedIn or portfolio URL.', 'Add linkedin.com/in/yourname or your portfolio site.'));

  const hostile: string[] = [];
  for (const h of FORMATTING_HOSTILE) if (h.rx.test(resume)) hostile.push(h.label);
  checks.push(hostile.length === 0
    ? pass('formatting_safe', 'ATS-safe characters', 'No hostile characters or emojis detected.')
    : fail('formatting_safe', 'ATS-safe characters', `${hostile.length} formatting issue(s) detected.`, 'Strip these characters so ATS parsers don’t mangle your resume.', hostile));

  const wc = tokenize(resume).length;
  const wcOk = wc >= 250 && wc <= 1100;
  checks.push(wcOk
    ? pass('length', 'Length', `${wc} words — within the recommended range.`)
    : wc < 250
      ? warn('length', 'Length', `${wc} words is short.`, 'Aim for ~400–700 words for a single-page resume.')
      : warn('length', 'Length', `${wc} words is long.`, 'Trim to ~400–700 words so it fits a single page.'));

  const ranges = extractDateRanges(resume);
  checks.push(ranges.length >= 1
    ? pass('dates_parseable', 'Dates parseable', `${ranges.length} date range(s) detected.`)
    : warn('dates_parseable', 'Dates parseable', 'No clear date ranges found in experience.', 'Use ranges like "Mar 2022 – Present" or "2021 – 2023".'));

  checks.push(BULLET_RX.test(resume)
    ? pass('bullets_present', 'Bullets in experience', 'Bullet structure detected.')
    : fail('bullets_present', 'Bullets in experience', 'No bullet points detected.', 'Structure work experience as bullets — easier to scan and parse.'));

  return makeCategory('ats_essentials', 'ATS Essentials', 'Mandatory items for ATS to parse and rank your resume.', 1.5, checks);
}

function categoryRedFlags(resume: string): Category {
  const checks: Check[] = [];
  const ranges = extractDateRanges(resume);

  if (ranges.length >= 2) {
    const sorted = [...ranges].sort((a, b) => a.startYear - b.startYear);
    const gaps: string[] = [];
    const shortTenures: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const tenure = r.endYear - r.startYear;
      if (tenure < 1 && !r.isPresent) shortTenures.push(`${r.startYear}–${r.endYear}`);
      if (i > 0) {
        const prev = sorted[i - 1];
        if (r.startYear - prev.endYear >= 2) gaps.push(`${prev.endYear} → ${r.startYear}`);
      }
    }
    checks.push(gaps.length === 0
      ? pass('employment_gaps', 'Employment gaps', 'No multi-year employment gaps detected.')
      : warn('employment_gaps', 'Employment gaps', `${gaps.length} gap(s) ≥ 2 years detected.`, 'Add context to gaps — sabbatical, contract work, full-time study.', gaps));
    checks.push(shortTenures.length === 0
      ? pass('short_tenures', 'Short tenures', 'No suspiciously short tenures.')
      : warn('short_tenures', 'Short tenures', `${shortTenures.length} tenure(s) under 1 year.`, 'Group contract / interim roles together or add context.', shortTenures));
  } else {
    checks.push(warn('employment_gaps', 'Employment gaps', 'Not enough date ranges to assess.', 'Add Start–End dates to each role.'));
  }

  const vagueTitles = ['various', 'multiple', 'specialist', 'consultant', 'professional'];
  const found = vagueTitles.filter((v) => new RegExp(`\\b${v}\\b`, 'i').test(resume));
  if (found.length === 0) checks.push(pass('vague_titles', 'Specific titles', 'Titles look specific.'));
  else if (found.length === 1) checks.push(warn('vague_titles', 'Specific titles', `Vague title found: "${found[0]}".`, 'Use specific titles (e.g. "Senior Product Designer" not "Design Consultant").'));
  else checks.push(warn('vague_titles', 'Specific titles', `${found.length} vague titles found.`, 'Recruiters skim titles — be specific.'));

  return makeCategory('hr_red_flags', 'HR Red Flags', 'Things that catch a recruiter’s eye for the wrong reasons.', 1.0, checks);
}

function categoryDiscrimination(resume: string): Category {
  const checks: Check[] = [];
  let any = false;
  for (const [rx, label] of DISCRIMINATION_PATTERNS) {
    const hits = resume.match(rx);
    if (hits && hits.length) {
      any = true;
      checks.push(warn(
        `bias_${label.replace(/\s+/g, '_').toLowerCase()}`,
        label,
        `${label} appears on your resume.`,
        'Remove this — protected categories shouldn’t influence hiring decisions.',
        hits.slice(0, 3),
      ));
    }
  }
  if (!any) {
    checks.push(pass('bias_none', 'Personal info', 'No protected-category info detected on the resume.'));
  }
  return makeCategory('discrimination', 'Discrimination Safety', 'Items that should NOT be on a resume.', 0.7, checks);
}

function categorySeniority(resume: string): Category {
  const checks: Check[] = [];
  const ranges = extractDateRanges(resume);

  if (ranges.length === 0) {
    checks.push(warn('years_experience', 'Years of experience', 'No date ranges to measure experience.', 'Add Start–End dates to your roles.'));
  } else {
    const minStart = Math.min(...ranges.map((r) => r.startYear));
    const maxEnd = Math.max(...ranges.map((r) => r.endYear));
    const years = maxEnd - minStart;
    checks.push(pass('years_experience', 'Years of experience', `${years} years of experience inferred (${minStart}–${maxEnd}).`));
  }

  const leadershipHits = LEADERSHIP_KEYWORDS
    .flatMap((k) => Array.from(resume.matchAll(new RegExp(`\\b${k}\\b`, 'gi'))).map((m) => m[0]));
  if (leadershipHits.length >= 3) checks.push(pass('leadership', 'Leadership signals', `${leadershipHits.length} leadership phrase(s) detected.`));
  else if (leadershipHits.length >= 1) checks.push(warn('leadership', 'Leadership signals', `Only ${leadershipHits.length} leadership phrase(s).`, 'Surface mentoring, hiring, or leading projects where it applies.'));
  else checks.push(warn('leadership', 'Leadership signals', 'No leadership phrases detected.', 'If you’ve led anything — projects, people, initiatives — say so explicitly.'));

  return makeCategory('seniority', 'Seniority', 'How clearly your resume signals scope and seniority.', 0.8, checks);
}

function categoryTailoring(resume: string, job: string): Category {
  const checks: Check[] = [];
  if (!job.trim()) {
    checks.push(warn('keyword_coverage', 'Tailored to job', 'No job description provided.', 'Paste a job description to score tailoring against it.'));
    const c = makeCategory('tailoring', 'Tailoring', 'How closely your resume matches the target job description.', 1.5, checks);
    c.keywords = { total: 0, matched: [], missing: [], rate: 0 };
    return c;
  }
  const keywords = extractKeywords(job);
  const lowered = ` ${resume.toLowerCase()} `;
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (lowered.includes(` ${kw} `)) matched.push(kw);
    else missing.push(kw);
  }
  const rate = matched.length / Math.max(1, keywords.length);

  const cov = rate >= 0.7
    ? pass('keyword_coverage', 'Keyword coverage', `${matched.length} of ${keywords.length} JD keywords present (${Math.round(rate * 100)}%).`)
    : rate >= 0.45
      ? warn('keyword_coverage', 'Keyword coverage', `${matched.length} of ${keywords.length} JD keywords present (${Math.round(rate * 100)}%).`, 'Weave in the top missing keywords below where they truthfully apply.')
      : fail('keyword_coverage', 'Keyword coverage', `Only ${matched.length} of ${keywords.length} JD keywords present (${Math.round(rate * 100)}%).`, 'Tailor your bullets to the JD. ResumeMint AI does this in one click.');
  cov.evidence = missing.slice(0, 12);
  checks.push(cov);

  const jdTitle = (job.split('\n')[0] || '').trim().slice(0, 100);
  if (jdTitle && jdTitle.length < 80) {
    const present = new RegExp(jdTitle.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, '\\s+'), 'i').test(resume);
    checks.push(present
      ? pass('title_match', 'Title alignment', 'Your resume mentions the role title.')
      : warn('title_match', 'Title alignment', 'Resume doesn’t mention the role title.', 'Use the exact role title in your summary or most recent role where accurate.'));
  }

  const c = makeCategory('tailoring', 'Tailoring', 'How closely your resume matches the target job description.', 1.5, checks);
  c.keywords = { total: keywords.length, matched, missing, rate };
  return c;
}

// ---- public entrypoint --------------------------------------------------

export function checkResumeAgainstJob(resume: string, job: string): AtsCheckResult {
  const safeResume = String(resume || '').trim();
  const safeJob = String(job || '').trim();

  const categories: Category[] = [
    categoryContent(safeResume),
    categorySections(safeResume),
    categoryAtsEssentials(safeResume),
    categoryRedFlags(safeResume),
    categoryDiscrimination(safeResume),
    categorySeniority(safeResume),
    categoryTailoring(safeResume, safeJob),
  ];

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const weightedSum = categories.reduce((s, c) => s + c.weight * c.scorePercent, 0);
  const score = Math.round(weightedSum / totalWeight);

  const tailoring = categories.find((c) => c.id === 'tailoring');
  const keywords = tailoring?.keywords || { total: 0, matched: [], missing: [], rate: 0 };

  return {
    score,
    band: bandFor(score),
    resumeWordCount: tokenize(safeResume).length,
    keywords,
    categories,
  };
}
