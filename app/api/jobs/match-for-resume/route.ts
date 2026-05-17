// app/api/jobs/match-for-resume/route.ts
//
// "Find me jobs that match this resume." Runs the same lexical match used
// elsewhere, but against the user's CACHED job_results pool (from /api/jobs
// searches they ran this month), and returns the top N matches.
//
// Optional side-effect: when ?notify=email is set AND there's at least one
// strong match, we fire a job-match email (debounced per day per user via the
// AiUsage feature key we use for caps — purely as a side-channel counter).
//
// Body: { resumeId?: string, notify?: 'email' | 'none', minScore?: number }
// Returns: {
//   matches: Array<{ title, company, location, score, matched, missing, focusUrl }>,
//   resumeId, resumeTitle, emailSent
// }

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';
import { sendJobMatchEmail } from '@/lib/email/templates/job-match';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

type JobCard = {
  title?: string;
  company?: string;
  location?: string;
  tags?: string[];
  description?: string;
  source?: string;
};

const STOPWORDS = new Set([
  'and','the','for','with','you','your','our','their','they','this','that',
  'are','was','will','have','has','had','from','into','about','etc','use',
  'using','used','work','works','working','team','teams','role','roles','job',
  'jobs','company','companies','candidate','candidates','position','positions',
  'experience','experienced','required','requirement','requirements','responsible',
  'responsibility','responsibilities','strong','great','excellent','good','must',
  'plus','years','year','minimum','prefer','preferred','willing','ability',
]);

function stripHtml(s?: string) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]{1,30}/gi) || []).map((t) => t.toLowerCase());
}

function extractCandidate(resumeData: any) {
  const weights = new Map<string, number>();
  const add = (raw: string, w: number) => {
    const t = raw.toLowerCase().trim();
    if (!t || t.length < 2 || t.length > 32 || STOPWORDS.has(t) || /^\d+$/.test(t)) return;
    weights.set(t, (weights.get(t) || 0) + w);
  };
  for (const sec of resumeData?.sections || []) {
    const key = String(sec?.key || '').toLowerCase();
    const recs = Array.isArray(sec?.records) ? sec.records : [];
    if (key === 'skills' || key === 'qualities') {
      for (const r of recs) {
        const t = stripHtml(r?.values?.header || r?.values?.[0] || '');
        if (t) { add(t, 8); for (const tk of tokens(t)) add(tk, 4); }
      }
    } else if (key === 'profile') {
      for (const r of recs) for (const tk of tokens(stripHtml(r?.values?.richtextValue || r?.values?.[1] || ''))) add(tk, 1);
    } else if (key === 'employment' || key === 'internships' || key === 'sideActivities') {
      for (const r of recs) {
        for (const tk of tokens(stripHtml(r?.values?.header || r?.values?.[0] || ''))) add(tk, 2);
        for (const tk of tokens(stripHtml(r?.values?.richtextValue || r?.values?.[4] || ''))) add(tk, 2);
      }
    } else if (key === 'certificates' || key === 'courses') {
      for (const r of recs) for (const tk of tokens(stripHtml(r?.values?.header || r?.values?.[0] || ''))) add(tk, 3);
    } else if (key === 'languages') {
      for (const r of recs) {
        const t = stripHtml(r?.values?.header || r?.values?.[0] || '');
        if (t) add(t, 4);
      }
    }
  }
  const keywords = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([k]) => k);
  return { keywords, weights };
}

function scoreJob(jd: string, cand: { keywords: string[]; weights: Map<string, number> }) {
  const hay = jd.toLowerCase();
  let mw = 0, tw = 0;
  const matched: string[] = [];
  for (const kw of cand.keywords) {
    const w = cand.weights.get(kw) || 1;
    tw += w;
    const safe = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[^a-z0-9+#.])${safe}(?:$|[^a-z0-9+#.])`, 'i').test(hay)) {
      matched.push(kw);
      mw += w;
    }
  }
  const score = tw === 0 ? 0 : Math.round((mw / tw) * 100);
  return { score: Math.max(0, Math.min(100, score)), matched, missing: cand.keywords.filter((k) => !matched.includes(k)).slice(0, 8) };
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  let firebaseEmail: string | null = null;
  let firebaseName: string | null = null;
  try {
    const fb = await getUserFromRequest();
    const row = await prisma.user.findUnique({
      where: { firebaseUid: fb.uid },
      select: { id: true, email: true },
    });
    userId = row?.id ?? null;
    firebaseEmail = row?.email ?? null;
    firebaseName = (fb as any)?.name || null;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    resumeId?: string;
    notify?: 'email' | 'none';
    minScore?: number;
  };
  const minScore = Math.max(0, Math.min(100, Number(body.minScore ?? 40)));

  // 1) Resume to compare against
  const resume = body.resumeId
    ? await prisma.resume.findFirst({
        where: { id: body.resumeId, userId },
        select: { id: true, title: true, data: true },
      })
    : await prisma.resume.findFirst({
        where: { userId, archived: false },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, data: true },
      });
  if (!resume) {
    return NextResponse.json({ matches: [], resumeId: null, resumeTitle: null, warn: 'no_resume' });
  }
  const cand = extractCandidate(resume.data);
  if (cand.keywords.length === 0) {
    return NextResponse.json({ matches: [], resumeId: resume.id, resumeTitle: resume.title, warn: 'empty_resume' });
  }

  // 2) Cached jobs the user has fetched (last 30 days)
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const jobRows = await prisma.jobResult.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 8, // most-recent few caches; each holds up to ~30 jobs
  });
  const jobs: JobCard[] = [];
  for (const r of jobRows) {
    const arr = Array.isArray(r.results) ? (r.results as any[]) : [];
    for (const j of arr) jobs.push(j as JobCard);
  }
  if (jobs.length === 0) {
    return NextResponse.json({ matches: [], resumeId: resume.id, resumeTitle: resume.title, warn: 'no_cached_jobs' });
  }

  // 3) Dedupe by title+company+source so the same listing doesn't appear twice
  const seen = new Set<string>();
  const unique: JobCard[] = [];
  for (const j of jobs) {
    const k = `${(j.title || '').trim().toLowerCase()}|${(j.company || '').trim().toLowerCase()}|${(j.source || '').trim().toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(j);
  }

  // 4) Score + sort
  const scored = unique.map((j) => {
    const text = [j.title, (j.tags || []).join(' '), j.location, stripHtml(j.description)].filter(Boolean).join(' ');
    return { job: j, ...scoreJob(text, cand) };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score >= minScore).slice(0, 3);

  // 5) Optional email side-effect — only fire when there's something worth telling.
  let emailSent = false;
  if (body.notify === 'email' && top.length > 0 && firebaseEmail && SITE_URL) {
    try {
      const res = await sendJobMatchEmail({
        to: firebaseEmail,
        firstName: firebaseName || null,
        resumeTitle: resume.title || 'your resume',
        jobs: top.map((s) => ({
          title: s.job.title || 'Untitled role',
          company: s.job.company || null,
          location: s.job.location || null,
          matchPct: s.score,
          focusUrl: `${SITE_URL}/jobs?source=${encodeURIComponent(s.job.source || '')}`,
        })),
        transactional: true,
      });
      emailSent = !!res.ok;
    } catch (e) {
      console.warn('[match-for-resume] email failed', (e as any)?.message || e);
    }
  }

  return NextResponse.json({
    resumeId: resume.id,
    resumeTitle: resume.title,
    matches: top.map((s) => ({
      title: s.job.title || 'Untitled role',
      company: s.job.company || null,
      location: s.job.location || null,
      score: s.score,
      matched: s.matched,
      missing: s.missing,
      source: s.job.source || null,
      // Deep link the in-app toast / email click should land on.
      focusUrl: `/jobs?source=${encodeURIComponent(s.job.source || '')}`,
    })),
    emailSent,
  });
}
