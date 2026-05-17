// app/api/jobs/match/route.ts
//
// Compute an AI match score per job from the user's most recent resume.
// Lexical/keyword overlap for speed — no OpenAI call here, so this is cheap
// enough to run on every job list refresh. (We can layer an LLM "explain why"
// for the top-K matches separately if we want richer rationale text.)
//
// Body: { jobs: JobCard[], resumeId?: string }
// Returns: {
//   keywords: string[],            // the user's interest set we matched against
//   matches: Array<{
//     index: number,               // index into input jobs[]
//     score: number,               // 0..100
//     matched: string[],           // keywords found in the JD
//     missing: string[],           // important keywords NOT in the JD
//   }>
// }
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type JobCard = {
  title?: string;
  company?: string;
  location?: string;
  tags?: string[];
  description?: string;
};

function stripHtml(s?: string) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common single-word stopwords plus boilerplate noise the JD always contains.
const STOPWORDS = new Set([
  'and','the','for','with','you','your','our','their','they','this','that',
  'are','was','will','have','has','had','from','into','about','etc','use',
  'using','used','work','works','working','team','teams','role','roles','job',
  'jobs','company','companies','candidate','candidates','position','positions',
  'experience','experienced','required','requirement','requirements','responsible',
  'responsibility','responsibilities','strong','great','excellent','good','must',
  'plus','years','year','minimum','prefer','preferred','willing','ability',
  'understanding','knowledge','familiar','familiarity','passion','passionate',
  'love','like','etc','including','includes','include','able','within','across',
  'who','what','where','when','why','how','any','all','some','few','many',
  'most','more','less','than','also','same','very','well','best','better','can',
  'should','would','could','must','may','should','either','other','others',
  'time','times','day','week','month','year','full','part','high','low',
]);

function tokensFromText(s: string): string[] {
  // Pull out word-like tokens including "." inside (Node.js, C++, .NET), keep
  // multi-char tokens, lowercase everything.
  const raw = s.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]{1,30}/gi) || [];
  return raw.map((t) => t.toLowerCase());
}

/** Pull a candidate-interest set from the resume's structured data. We weight
 * skills > tools-in-job-bullets > general profile/employment text. */
function extractCandidateKeywords(resumeData: any): { keywords: string[]; weights: Map<string, number> } {
  const weights = new Map<string, number>();
  const add = (raw: string, w: number) => {
    const t = raw.toLowerCase().trim();
    if (!t || t.length < 2 || t.length > 32) return;
    if (STOPWORDS.has(t)) return;
    if (/^\d+$/.test(t)) return;
    weights.set(t, (weights.get(t) || 0) + w);
  };

  if (!resumeData?.sections || !Array.isArray(resumeData.sections)) {
    return { keywords: [], weights };
  }

  for (const sec of resumeData.sections) {
    const key = String(sec?.key || '').toLowerCase();
    const records = Array.isArray(sec?.records) ? sec.records : [];

    if (key === 'skills' || key === 'qualities') {
      for (const r of records) {
        const v = r?.values || {};
        const skill = stripHtml(v.header || v[0] || '');
        if (!skill) continue;
        // Skill names are high signal. Index both the whole phrase and tokens.
        add(skill, 8);
        for (const t of tokensFromText(skill)) add(t, 4);
      }
    } else if (key === 'profile') {
      for (const r of records) {
        const v = r?.values || {};
        const txt = stripHtml(v.richtextValue || v[1] || v.value || '');
        for (const t of tokensFromText(txt)) add(t, 1);
      }
    } else if (key === 'employment' || key === 'internships' || key === 'sideActivities') {
      for (const r of records) {
        const v = r?.values || {};
        const role = stripHtml(v.header || v[0] || '');
        const detail = stripHtml(v.richtextValue || v[4] || v.value || '');
        for (const t of tokensFromText(role)) add(t, 2);
        for (const t of tokensFromText(detail)) add(t, 2);
      }
    } else if (key === 'certificates' || key === 'courses') {
      for (const r of records) {
        const v = r?.values || {};
        const title = stripHtml(v.header || v[0] || '');
        for (const t of tokensFromText(title)) add(t, 3);
      }
    } else if (key === 'languages') {
      for (const r of records) {
        const v = r?.values || {};
        const lang = stripHtml(v.header || v[0] || '');
        if (lang) add(lang, 4);
      }
    }
  }

  // Keep the top-50 by weight so we don't drown the score in low-signal terms.
  const keywords = [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([k]) => k);
  return { keywords, weights };
}

function scoreJob(jd: string, candidate: { keywords: string[]; weights: Map<string, number> }) {
  const haystack = jd.toLowerCase();
  const matched: string[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const kw of candidate.keywords) {
    const w = candidate.weights.get(kw) || 1;
    totalWeight += w;
    // Word-boundary-aware contains. Escape regex specials in kw.
    const safe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[^a-z0-9+#.])${safe}(?:$|[^a-z0-9+#.])`, 'i');
    if (re.test(haystack)) {
      matched.push(kw);
      matchedWeight += w;
    }
  }

  const score = totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100);
  const missing = candidate.keywords.filter((k) => !matched.includes(k)).slice(0, 8);
  return { score: Math.max(0, Math.min(100, score)), matched, missing };
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const u = await getUserFromRequest();
      const row = await prisma.user.findUnique({
        where: { firebaseUid: u.uid },
        select: { id: true },
      });
      userId = row?.id ?? null;
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as {
      jobs?: JobCard[];
      resumeId?: string;
    };
    const jobs = Array.isArray(body.jobs) ? body.jobs.slice(0, 100) : [];

    if (jobs.length === 0) {
      return NextResponse.json({ keywords: [], matches: [] });
    }

    // Load the resume the user wants matched (specific id or most recent).
    const resume = body.resumeId
      ? await prisma.resume.findFirst({
          where: { id: body.resumeId, userId },
          select: { data: true },
        })
      : await prisma.resume.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { data: true },
        });

    if (!resume) {
      // No resume to compare against — return neutral matches.
      return NextResponse.json({
        keywords: [],
        matches: jobs.map((_, i) => ({ index: i, score: 0, matched: [], missing: [] })),
        warn: 'no_resume_to_compare',
      });
    }

    const candidate = extractCandidateKeywords(resume.data);
    if (candidate.keywords.length === 0) {
      return NextResponse.json({
        keywords: [],
        matches: jobs.map((_, i) => ({ index: i, score: 0, matched: [], missing: [] })),
        warn: 'no_keywords_in_resume',
      });
    }

    const matches = jobs.map((j, i) => {
      const text = [j.title, j.tags?.join(' '), j.location, stripHtml(j.description)]
        .filter(Boolean)
        .join(' ');
      const { score, matched, missing } = scoreJob(text, candidate);
      return { index: i, score, matched, missing };
    });

    return NextResponse.json({ keywords: candidate.keywords, matches });
  } catch (e: any) {
    console.error('[jobs/match] error', e);
    return NextResponse.json(
      { error: 'match_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
