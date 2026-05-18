// lib/atsCheck.ts
//
// Deterministic ATS scorer for the free /resume-checker page. No AI calls
// (cheap, instant, predictable). The scoring model:
//
//  - Keyword coverage (60%): extract candidate keywords from the JD,
//    measure how many appear in the resume.
//  - Formatting hygiene (40%): contact info present, decent length,
//    bullet structure, no obvious ATS-hostile patterns.

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

const FORMATTING_HOSTILE = [
  { rx: /\|/g, label: 'Avoid pipe characters (|) — some ATS parsers treat them as field separators.' },
  { rx: /\t/g, label: 'Avoid tab characters — paste your resume as plain text.' },
  { rx: /[\u2028\u2029]/g, label: 'Avoid line-separator unicode characters.' },
];

const PHONE_RX = /(\+?\d[\s().-]?){7,}/;
const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RX = /\b(https?:\/\/|www\.|[a-z0-9-]+\.)[^\s]+\.(com|net|org|io|dev|design|co|app|me|so)\b/i;
const BULLET_RX = /(^|\n)[\s•·\-\*•]\s+/;

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Extract candidate keywords from a job description: single tech tokens + 2/3-word phrases. */
export function extractKeywords(jd: string): string[] {
  const tokens = tokenize(jd);
  if (!tokens.length) return [];
  const out = new Set<string>();

  // Single tokens that look like skills (allow + and # for "C++"/"C#").
  for (const tok of tokens) {
    if (tok.length < 2) continue;
    if (STOPWORDS.has(tok)) continue;
    if (/^\d+$/.test(tok)) continue;
    out.add(tok);
  }

  // 2-word phrases (skip stopwords as the leading word — keeps things tight).
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    if (a.length < 2 || b.length < 2) continue;
    out.add(`${a} ${b}`);
  }
  // 3-word phrases (only emit when none of the words are stopwords; rare but
  // catches "applicant tracking systems" / "machine learning engineer" etc.)
  for (let i = 0; i < tokens.length - 2; i++) {
    const a = tokens[i], b = tokens[i + 1], c = tokens[i + 2];
    if (STOPWORDS.has(a) || STOPWORDS.has(b) || STOPWORDS.has(c)) continue;
    if (a.length < 2 || b.length < 2 || c.length < 2) continue;
    out.add(`${a} ${b} ${c}`);
  }

  // Sort by length desc (longer phrases first when displayed) then alphabetically.
  return Array.from(out).sort((x, y) => y.length - x.length || x.localeCompare(y));
}

type Coverage = {
  matched: string[];
  missing: string[];
  matchRate: number; // 0..1
};

function computeCoverage(resumeText: string, keywords: string[]): Coverage {
  const lowered = ` ${resumeText.toLowerCase()} `;
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    // Word-boundary check; allow "c++" / "c#" intact.
    const needle = ` ${kw} `;
    if (lowered.includes(needle)) matched.push(kw);
    else missing.push(kw);
  }
  const total = keywords.length || 1;
  return { matched, missing, matchRate: matched.length / total };
}

export type AtsCheckResult = {
  score: number;
  band: 'low' | 'fair' | 'good' | 'excellent';
  resumeWordCount: number;
  keywords: {
    total: number;
    matched: string[];
    missing: string[];
    rate: number;
  };
  hygiene: {
    hasEmail: boolean;
    hasPhone: boolean;
    hasLink: boolean;
    hasBullets: boolean;
    hostile: string[];
    wordCountOk: boolean; // 300..900 = ok
  };
  recommendations: string[];
};

const SCORE_WEIGHT_KEYWORDS = 0.6;
const SCORE_WEIGHT_HYGIENE = 0.4;

function bandFor(score: number): AtsCheckResult['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'low';
}

export function checkResumeAgainstJob(
  resumeText: string,
  jobText: string,
): AtsCheckResult {
  const safeResume = String(resumeText || '').trim();
  const safeJob = String(jobText || '').trim();

  // ---- Hygiene
  const hostile: string[] = [];
  for (const h of FORMATTING_HOSTILE) {
    if (h.rx.test(safeResume)) hostile.push(h.label);
  }
  const hasEmail = EMAIL_RX.test(safeResume);
  const hasPhone = PHONE_RX.test(safeResume);
  const hasLink = URL_RX.test(safeResume);
  const hasBullets = BULLET_RX.test(safeResume);
  const wordCount = tokenize(safeResume).length;
  const wordCountOk = wordCount >= 250 && wordCount <= 1100;

  const hygieneItems = [hasEmail, hasPhone, hasLink, hasBullets, wordCountOk, hostile.length === 0];
  const hygieneScore = hygieneItems.filter(Boolean).length / hygieneItems.length;

  // ---- Keywords
  const keywords = extractKeywords(safeJob);
  const cov = computeCoverage(safeResume, keywords);

  // Score: weighted blend, scaled to 100.
  const score = Math.round(
    (SCORE_WEIGHT_KEYWORDS * cov.matchRate + SCORE_WEIGHT_HYGIENE * hygieneScore) * 100,
  );

  // ---- Recommendations
  const recs: string[] = [];
  if (!hasEmail) recs.push('Add an email address to your resume header.');
  if (!hasPhone) recs.push('Include a phone number so recruiters can reach you.');
  if (!hasLink) recs.push('Add a LinkedIn URL or portfolio link.');
  if (!hasBullets) recs.push('Structure work experience as bullet points — easier for ATS to parse.');
  if (wordCount < 250) recs.push(`Your resume is short (${wordCount} words). Aim for ~400–700 words.`);
  if (wordCount > 1100) recs.push(`Your resume is long (${wordCount} words). Trim toward 400–700 for a single page.`);
  for (const h of hostile) recs.push(h);

  // Top missing keywords (show up to 8 most prominent — long phrases first).
  const topMissing = cov.missing.slice(0, 8);
  if (topMissing.length) {
    recs.push(`Weave in these JD keywords where they apply: ${topMissing.join(', ')}.`);
  }

  return {
    score,
    band: bandFor(score),
    resumeWordCount: wordCount,
    keywords: {
      total: keywords.length,
      matched: cov.matched,
      missing: cov.missing,
      rate: cov.matchRate,
    },
    hygiene: {
      hasEmail,
      hasPhone,
      hasLink,
      hasBullets,
      hostile,
      wordCountOk,
    },
    recommendations: recs,
  };
}
