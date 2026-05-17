// app/api/assist/cover-letter-tailor/route.ts
//
// Tailors a cover letter to a specific job description using OpenAI.
// Returns updated `subject` + `paragraphs` (3–5 short paragraphs). Optionally
// uses a linked resume's content for richer, more accurate tailoring.
//
// Body: { data: CoverLetterData, jdText?: string, jdUrl?: string, resumeId?: string }
// Returns: { subject: string, paragraphs: string[] }

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from '@/lib/aiUsage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Premium route — uses OPENAI_MODEL_PREMIUM (default gpt-4o) so paying users
// get the better model.
const MODEL = process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL || 'gpt-4o';

type CoverLetterData = {
  sender?: { fullName?: string; email?: string; phone?: string; address?: string; city?: string };
  recipient?: { name?: string; title?: string; company?: string; address?: string; city?: string };
  date?: string;
  subject?: string;
  salutation?: string;
  paragraphs?: string[];
  closing?: string;
  signatureName?: string;
};

function stripHtml(s?: string) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

/** Pull a short textual summary out of a saved resume so the model has context
 * about the candidate without us shipping the whole structured doc. */
function summarizeResume(resumeData: any): string {
  if (!resumeData?.sections || !Array.isArray(resumeData.sections)) return '';
  const lines: string[] = [];
  for (const sec of resumeData.sections) {
    const key = String(sec?.key || '').toLowerCase();
    const records = Array.isArray(sec?.records) ? sec.records : [];
    if (key === 'profile') {
      const text = records
        .flatMap((r: any) => Object.values(r?.values || {}))
        .filter(Boolean)
        .map((v: any) => stripHtml(String(v)))
        .join(' ');
      if (text) lines.push(`Profile: ${text.slice(0, 600)}`);
    } else if (key === 'employment') {
      for (const r of records.slice(0, 5)) {
        const v = r?.values || {};
        const role = stripHtml(v.header || v[0] || '');
        const company = stripHtml(v.subheader || v[1] || '');
        const period = stripHtml(v.period || v[3] || '');
        const detail = stripHtml(v.richtextValue || v[4] || v.value || '');
        const line = [role, company, period].filter(Boolean).join(' · ');
        if (line) lines.push(`Job: ${line}${detail ? ' — ' + detail.slice(0, 300) : ''}`);
      }
    } else if (key === 'skills') {
      const sk = records.map((r: any) => stripHtml(r?.values?.header || r?.values?.[0] || '')).filter(Boolean).slice(0, 30);
      if (sk.length) lines.push(`Skills: ${sk.join(', ')}`);
    } else if (key === 'educations') {
      for (const r of records.slice(0, 3)) {
        const v = r?.values || {};
        const deg = stripHtml(v.header || v[0] || '');
        const sch = stripHtml(v.subheader || v[1] || '');
        if (deg || sch) lines.push(`Education: ${[deg, sch].filter(Boolean).join(' · ')}`);
      }
    }
  }
  return lines.join('\n');
}

async function fetchJdFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`fetch_jd_failed_${res.status}`);
  const html = await res.text();
  // Crude readability: drop scripts/styles, collapse whitespace.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

const SYSTEM_PROMPT = `You are an expert cover-letter editor. Given a job description and the candidate's existing cover letter (plus optional resume summary), produce a tailored version.

Rules:
- Keep it concise: 3–5 short paragraphs total (50–100 words each), no fluff, no clichés.
- Match concrete keywords/responsibilities from the job description without keyword-stuffing.
- Preserve the candidate's voice, salutation, closing, sender/recipient details.
- Open with a hook that names the role + company. Don't say "I am writing to apply".
- Close with a confident, action-oriented last paragraph.
- Output a JSON object only — no markdown fences, no commentary.

JSON shape:
{
  "subject": "string (1 line, role + company)",
  "paragraphs": ["string", "string", "string"]   // 3–5 items
}`;

export async function POST(req: NextRequest) {
  try {
    // Auth required — same pattern as section-suggest etc.
    let userId: string | null = null;
    try {
      const u = await getUserFromRequest();
      // Map firebase uid → users.id
      const row = await prisma.user.findUnique({
        where: { firebaseUid: u.uid },
        select: { id: true },
      });
      userId = row?.id ?? null;
    } catch {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 403 });

    // Per-user rate limit. Fail fast before the OpenAI call.
    const quota = await checkAiUsage(userId, 'cover-letter-tailor');
    if (!quota.ok) {
      return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      data?: CoverLetterData;
      jdText?: string;
      jdUrl?: string;
      resumeId?: string;
    };

    const cv = body.data || {};
    let jd = String(body.jdText || '').trim();
    if (!jd && body.jdUrl) {
      try { jd = await fetchJdFromUrl(body.jdUrl); } catch {}
    }
    if (!jd) {
      return NextResponse.json({ error: 'missing_jd' }, { status: 400 });
    }

    // Optionally enrich with resume summary
    let resumeSummary = '';
    if (body.resumeId && userId) {
      try {
        const r = await prisma.resume.findFirst({
          where: { id: body.resumeId, userId },
          select: { data: true },
        });
        if (r) resumeSummary = summarizeResume(r.data);
      } catch { /* non-fatal */ }
    }

    const userPrompt = [
      `JOB DESCRIPTION:\n${jd.slice(0, 6000)}`,
      '',
      `CANDIDATE (sender):`,
      `Name: ${cv.sender?.fullName || ''}`,
      `Contact: ${[cv.sender?.email, cv.sender?.phone].filter(Boolean).join(' · ')}`,
      `Location: ${[cv.sender?.city, cv.sender?.address].filter(Boolean).join(', ')}`,
      '',
      `RECIPIENT (target):`,
      `Name: ${cv.recipient?.name || 'Hiring Manager'}`,
      `Title: ${cv.recipient?.title || ''}`,
      `Company: ${cv.recipient?.company || ''}`,
      '',
      `EXISTING SUBJECT: ${cv.subject || '(none)'}`,
      `EXISTING SALUTATION: ${cv.salutation || 'Dear Hiring Manager,'}`,
      '',
      `EXISTING PARAGRAPHS:\n${(cv.paragraphs || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
      resumeSummary ? `\nCANDIDATE RESUME SUMMARY:\n${resumeSummary}` : '',
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let parsed: { subject?: string; paragraphs?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'bad_model_output', detail: raw.slice(0, 200) }, { status: 502 });
    }

    const subject = String(parsed.subject || '').slice(0, 200);
    const paragraphs = Array.isArray(parsed.paragraphs)
      ? parsed.paragraphs.map((p) => String(p || '').trim()).filter(Boolean).slice(0, 6)
      : [];

    if (!subject && paragraphs.length === 0) {
      return NextResponse.json({ error: 'empty_suggestion' }, { status: 502 });
    }

    // Record AFTER success.
    await recordAiUsage(userId, 'cover-letter-tailor');

    return NextResponse.json({
      subject,
      paragraphs,
      quota: {
        feature: quota.feature,
        remainingDay: Math.max(0, quota.remainingDay - 1),
        remainingMonth: Math.max(0, quota.remainingMonth - 1),
        dayLimit: quota.dayLimit,
        monthLimit: quota.monthLimit,
      },
    });
  } catch (e: any) {
    console.error('[cover-letter-tailor] error', e);
    return NextResponse.json(
      { error: 'tailor_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
