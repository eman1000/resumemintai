// app/api/jobs/tailor-kit/route.ts
//
// "Auto-Apply Pro" core endpoint. Given a job listing + the user's resume,
// generates a tailored resume (clone of the source resume with rewritten
// employment bullets) and a tailored cover letter, atomically saves both as
// new rows (linked via cover_letters.resume_id), and returns their ids.
//
// One OpenAI call (JSON-mode) returns both artifacts to keep latency and cost
// reasonable — three sequential calls (analyze → optimize → cover) were
// rejected as too slow / too expensive for this volume.
//
// Auth required. PRO-gated: aborts with 402 if the caller has no active /
// trialing subscription.
//
// Body:  { job: { title, company?, location?, description?, tags?[], source? },
//          resumeId?: string }   // defaults to most recently updated resume
// Returns: { resumeId, coverLetterId, title, summary: string }

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';
import { checkAiUsage, recordAiUsage, quotaBlockedResponse } from '@/lib/aiUsage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// Premium route — uses OPENAI_MODEL_PREMIUM (default gpt-4o) so paying users
// get the better model. Falls back to OPENAI_MODEL if the premium one isn't set.
const MODEL = process.env.OPENAI_MODEL_PREMIUM || process.env.OPENAI_MODEL || 'gpt-4o';

type JobInput = {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  tags?: string[];
  source?: string;
};

const ACTIVE_SUB_STATUSES = ['active', 'trialing', 'past_due'];

async function isUserSubscribed(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE_SUB_STATUSES } },
    select: { id: true },
  });
  return !!sub;
}

function stripHtml(s?: string) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Heuristic: does this resume actually have content worth tailoring?
 * We require at least ONE of:
 *  - 1 employment record with ≥1 bullet (≥10 chars)
 *  - 3+ filled skills
 *  - profile blurb with ≥80 chars of stripped text
 * Otherwise we treat the resume as an empty default shell. */
function hasMeaningfulResumeContent(resumeData: any): boolean {
  if (!resumeData?.sections || !Array.isArray(resumeData.sections)) return false;
  let skillCount = 0;
  let profileChars = 0;
  let employmentBullets = 0;
  for (const sec of resumeData.sections) {
    const key = String(sec?.key || '').toLowerCase();
    const records = Array.isArray(sec?.records) ? sec.records : [];
    if (key === 'skills') {
      for (const r of records) {
        const v = r?.values || {};
        if (stripHtml(v.header || v[0]).length > 0) skillCount += 1;
      }
    } else if (key === 'profile') {
      for (const r of records) {
        const v = r?.values || {};
        profileChars += stripHtml(v.richtextValue || v[1] || v.value || '').length;
      }
    } else if (key === 'employment') {
      for (const r of records) {
        const v = r?.values || {};
        const html = String(v.richtextValue || v[4] || '');
        const lis = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
          .map((m) => stripHtml(m[1]))
          .filter((t) => t.length >= 10);
        const plain = stripHtml(html);
        if (lis.length > 0) employmentBullets += lis.length;
        else if (plain.length >= 30) employmentBullets += 1;
      }
    }
  }
  return employmentBullets >= 1 || skillCount >= 3 || profileChars >= 80;
}

const SYSTEM_PROMPT = `You are an expert career editor. Given a job listing and the candidate's resume sections, produce:
  1) Tailored bullet replacements for the top 3 employment records (most recent first). Keep the same number of bullets where possible (max 5). Bullets must be concise, achievement-oriented, ideally with a metric. Don't invent facts: only rephrase or re-emphasize what is plausibly true from the candidate's existing bullets.
  2) A tailored cover letter: 1-line subject, 3–4 paragraphs (50–100 words each), no clichés, no "I am writing to apply" openings. Open with a concrete hook naming the role + company. Close with a confident action-oriented paragraph.

Output a JSON object ONLY (no markdown):
{
  "tailoredBullets": [
    { "recordKey": "string-or-empty", "bullets": ["...", "..."] },
    { "recordKey": "string-or-empty", "bullets": ["..."] }
  ],
  "coverLetter": {
    "subject": "string",
    "paragraphs": ["string", "string", "string"]
  },
  "summary": "1-sentence note about what you emphasized"
}

Rules:
- If a record's bullets are best left alone, return its recordKey with the original bullets unchanged.
- Use only HTML-safe text in bullets; no markdown, no tables, no images.
- Echo concrete JD keywords (skills, tools, responsibilities) only when accurate.
- Never include the candidate's email, phone, or other PII in the cover letter body (the template prints those from contact fields).`;

function findEmploymentRecords(sections: any[]): { sectionIndex: number; recordIndex: number; key: string; bullets: string[]; rolePeriod: string }[] {
  if (!Array.isArray(sections)) return [];
  const out: any[] = [];
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    if (!sec || String(sec.key || '').toLowerCase() !== 'employment') continue;
    const records = Array.isArray(sec.records) ? sec.records : [];
    for (let ri = 0; ri < records.length; ri++) {
      const r = records[ri];
      const v = r?.values || {};
      const html = stripHtml(v.richtextValue || v[4] || v.value || '');
      // Extract <li> bullets if present, else split lines.
      const liMatches = Array.from(String(v.richtextValue || v[4] || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
      const bullets = liMatches.length
        ? liMatches.map((m) => stripHtml(m[1])).filter(Boolean)
        : html.split(/[\n.]+/).map((s) => s.trim()).filter((s) => s.length > 8);
      const role = stripHtml(v.header || v[0] || '');
      const company = stripHtml(v.subheader || v[1] || '');
      const period = stripHtml(v.period || v[3] || '');
      out.push({
        sectionIndex: si,
        recordIndex: ri,
        key: r?.key || '',
        bullets,
        rolePeriod: `${role}${company ? ' @ ' + company : ''}${period ? ' (' + period + ')' : ''}`,
      });
    }
  }
  // Most recent first; if no period info, original order is preserved.
  return out.slice(0, 3);
}

function applyBulletReplacement(sections: any[], targetRecordKey: string, bullets: string[]) {
  // Returns a *new* sections array (immutable) with the matching record's
  // richtextValue rewritten into an HTML <ul>.
  const next = sections.map((sec) => {
    if (String(sec?.key || '').toLowerCase() !== 'employment') return sec;
    const records = Array.isArray(sec.records) ? sec.records : [];
    let touched = false;
    const newRecords = records.map((r: any) => {
      if (!targetRecordKey || r?.key !== targetRecordKey) return r;
      touched = true;
      const v = { ...(r?.values || {}) };
      const html = `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`;
      // Update whichever shape this template uses.
      if ('richtextValue' in v) v.richtextValue = html;
      else v[4] = html;
      return { ...r, values: v };
    });
    return touched ? { ...sec, records: newRecords } : sec;
  });
  return next;
}

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayHuman(): string {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function extractContact(sections: any[]) {
  const pd = (sections || []).find((s: any) => String(s?.key || '').toLowerCase() === 'personaldetails');
  const v: Record<string, any> = pd?.records?.[0]?.values || {};
  return {
    fullName: stripHtml(`${v.givenName || ''} ${v.familyName || ''}`).trim(),
    email: stripHtml(v.email),
    phone: stripHtml(v.phone),
    address: stripHtml(v.address),
    city: stripHtml(v.city),
    linkedIn: stripHtml(v.linkedin),
  };
}

export async function POST(req: NextRequest) {
  // Auth + sub gate
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

  if (!(await isUserSubscribed(userId))) {
    return NextResponse.json(
      { error: 'subscription_required', detail: 'Tailor-kit is a PRO feature.' },
      { status: 402 },
    );
  }

  // Per-user rate limit (daily + monthly). Refuse here so we don't burn a
  // GPT-4o call for a user who is over quota.
  const quota = await checkAiUsage(userId, 'tailor-kit');
  if (!quota.ok) {
    return NextResponse.json(quotaBlockedResponse(quota), { status: 429 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { job?: JobInput; resumeId?: string };
    const job = body.job || {};
    if (!job.title && !job.description) {
      return NextResponse.json({ error: 'missing_job' }, { status: 400 });
    }

    // Load source resume (specific id or most recent owned by user)
    const source = body.resumeId
      ? await prisma.resume.findFirst({
          where: { id: body.resumeId, userId },
          select: { id: true, title: true, renderer: true, data: true, language: true },
        })
      : await prisma.resume.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, renderer: true, data: true, language: true },
        });
    if (!source) {
      return NextResponse.json(
        {
          error: 'no_resume',
          detail: 'Create or import a resume first — we tailor your real content, we don\'t fabricate it.',
        },
        { status: 400 },
      );
    }

    const sourceData = (source.data as any) || {};
    const sections: any[] = Array.isArray(sourceData?.sections) ? sourceData.sections : [];

    // Refuse to tailor empty default shells. Without baseline content the LLM
    // would either fabricate experience or return blanks — both bad.
    if (!hasMeaningfulResumeContent(sourceData)) {
      return NextResponse.json(
        {
          error: 'empty_resume',
          detail:
            'Your resume needs some content before we can tailor it: at least one job with bullets, three skills, or a profile summary.',
        },
        { status: 422 },
      );
    }
    const employmentTargets = findEmploymentRecords(sections);
    const contact = extractContact(sections);

    // Compose the LLM input.
    const jdText = [
      job.title ? `Title: ${job.title}` : '',
      job.company ? `Company: ${job.company}` : '',
      job.location ? `Location: ${job.location}` : '',
      job.tags?.length ? `Tags: ${job.tags.join(', ')}` : '',
      job.description ? `Description:\n${stripHtml(job.description).slice(0, 6000)}` : '',
    ].filter(Boolean).join('\n');

    const candidateBlock = {
      contact,
      employment: employmentTargets.map((e) => ({
        recordKey: e.key,
        role: e.rolePeriod,
        bullets: e.bullets,
      })),
    };

    const userPrompt = [
      'JOB:',
      jdText,
      '',
      'CANDIDATE (existing resume excerpts):',
      JSON.stringify(candidateBlock).slice(0, 60_000),
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'bad_model_output', detail: raw.slice(0, 200) }, { status: 502 });
    }

    // Apply tailored bullets to a CLONE of the source sections.
    let tailoredSections = JSON.parse(JSON.stringify(sections));
    const tailoredBullets: Array<{ recordKey?: string; bullets?: string[] }> = Array.isArray(parsed.tailoredBullets)
      ? parsed.tailoredBullets
      : [];

    for (const t of tailoredBullets) {
      if (!t?.recordKey || !Array.isArray(t.bullets) || t.bullets.length === 0) continue;
      const safeBullets = t.bullets
        .map((b) => stripHtml(String(b || '')))
        .filter((b) => b && b.length <= 600)
        .slice(0, 6);
      if (safeBullets.length === 0) continue;
      tailoredSections = applyBulletReplacement(tailoredSections, t.recordKey, safeBullets);
    }

    // Build the new resume + cover letter records.
    const jobTitleClean = (job.title || 'Untitled role').trim().slice(0, 80);
    const companyClean = (job.company || '').trim().slice(0, 80);
    const tailoredResumeTitle = [
      source.title || 'Tailored CV',
      '—',
      companyClean ? `${jobTitleClean} @ ${companyClean}` : jobTitleClean,
    ].join(' ').slice(0, 200);

    const cl = parsed.coverLetter || {};
    const clSubject = stripHtml(cl.subject || '').slice(0, 200) ||
      (companyClean ? `Application: ${jobTitleClean} at ${companyClean}` : `Application: ${jobTitleClean}`);
    const clParagraphs: string[] = Array.isArray(cl.paragraphs)
      ? cl.paragraphs.map((p: any) => stripHtml(String(p || ''))).filter(Boolean).slice(0, 6)
      : [];

    if (clParagraphs.length === 0) {
      return NextResponse.json({ error: 'empty_cover_letter' }, { status: 502 });
    }

    const coverLetterData = {
      id: 'local',
      sender: {
        fullName: contact.fullName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        address: contact.address || '',
        city: contact.city || '',
        ...(contact.linkedIn ? { linkedIn: contact.linkedIn } : {}),
      },
      recipient: {
        name: 'Hiring Manager',
        title: '',
        company: companyClean,
        address: '',
        city: job.location || '',
      },
      date: todayHuman(),
      subject: clSubject,
      salutation: 'Dear Hiring Manager,',
      paragraphs: clParagraphs,
      closing: 'Sincerely,',
      signatureName: contact.fullName || '',
    };

    // Snapshot of the job we tailored for — persisted on both rows so the
    // jobs page can detect "you already tailored this" and link straight back.
    const tailoredForJob = {
      source: job.source || null,
      title: jobTitleClean,
      company: companyClean || null,
      location: job.location || null,
      tailoredAt: new Date().toISOString(),
    };

    // Transactionally create the resume + cover letter so we never end up
    // with a dangling cover letter if the resume insert fails.
    const result = await prisma.$transaction(async (tx) => {
      const newResume = await tx.resume.create({
        data: {
          userId,
          title: tailoredResumeTitle,
          renderer: source.renderer || 'professional',
          data: { ...sourceData, sections: tailoredSections } as any,
          language: source.language || null,
          archived: false,
          tailoredForJob: tailoredForJob as any,
        },
        select: { id: true, title: true },
      });

      const newCoverLetter = await tx.coverLetter.create({
        data: {
          userId,
          resumeId: newResume.id,
          title: tailoredResumeTitle + ' — Cover Letter',
          renderer: 'professional',
          data: coverLetterData as any,
          language: source.language || null,
          archived: false,
          tailoredForJob: tailoredForJob as any,
        },
        select: { id: true, title: true },
      });

      return { newResume, newCoverLetter };
    });

    // Record AFTER success so failed calls don't count against the user.
    await recordAiUsage(userId, 'tailor-kit');

    return NextResponse.json({
      resumeId: result.newResume.id,
      coverLetterId: result.newCoverLetter.id,
      title: result.newResume.title,
      summary: String(parsed.summary || '').slice(0, 400),
      // Remaining quota AFTER this call — gives the UI an honest counter.
      quota: {
        feature: quota.feature,
        remainingDay: Math.max(0, quota.remainingDay - 1),
        remainingMonth: Math.max(0, quota.remainingMonth - 1),
        dayLimit: quota.dayLimit,
        monthLimit: quota.monthLimit,
      },
    });
  } catch (e: any) {
    console.error('[jobs/tailor-kit] error', e);
    return NextResponse.json(
      { error: 'tailor_kit_failed', detail: e?.message || 'unexpected_error' },
      { status: 500 },
    );
  }
}
