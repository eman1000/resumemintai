// app/api/ats/check/route.ts
//
// Public, no-auth ATS check used by /resume-checker. Deterministic scoring
// (lib/atsCheck.ts) so no AI tokens are spent — anyone can hit it.
//
// Light per-IP rate limit guards against abuse: 30 checks / hour / IP.

import { NextRequest, NextResponse } from 'next/server';
import { checkResumeAgainstJob } from '@/lib/atsCheck';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function ipFromRequest(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.ip || 'unknown';
}

function rateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (b.count >= RATE_LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

const MAX_RESUME = 30_000;
const MAX_JOB = 30_000;

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', detail: `Too many checks. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const resume = String(body?.resume || '').slice(0, MAX_RESUME).trim();
  const job = String(body?.job || '').slice(0, MAX_JOB).trim();

  if (!resume) {
    return NextResponse.json({ error: 'missing_resume', detail: 'Paste your resume.' }, { status: 400 });
  }
  if (!job) {
    return NextResponse.json({ error: 'missing_job', detail: 'Paste the job description.' }, { status: 400 });
  }
  if (resume.length < 100) {
    return NextResponse.json(
      { error: 'resume_too_short', detail: 'Resume looks too short — paste the whole thing for an accurate score.' },
      { status: 400 },
    );
  }

  const result = checkResumeAgainstJob(resume, job);
  return NextResponse.json(result);
}
