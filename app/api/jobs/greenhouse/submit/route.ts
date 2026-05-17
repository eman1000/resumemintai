// app/api/jobs/greenhouse/submit/route.ts
//
// Auth-required, subscription-gated submission of a Greenhouse application.
// The client posts multipart/form-data:
//   - url:            the Greenhouse apply URL
//   - answers:        JSON-encoded object keyed by Greenhouse field `name`,
//                     values mapped according to the question type.
//   - resume:         File (PDF) — required by every Greenhouse posting.
//   - cover_letter:   optional File (PDF) for boards that accept it.
//   - resumeId:       optional resumes.id to tie the application back to
//   - coverLetterId:  optional cover_letters.id
//
// We re-fetch the schema server-side to validate field names so we don't
// accept arbitrary keys, then forward to Greenhouse. On 200/201 from
// Greenhouse we insert an Application row with status='submitted'.
//
// Caps share the existing AiUsage feature key so a single user can't
// auto-submit hundreds in a day.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';
import {
  parseGreenhouseUrl,
  fetchGreenhouseSchema,
  greenhouseSubmitUrl,
} from '@/lib/greenhouse';
import { signPrintToken } from '@/lib/printToken';
import { renderResumePdfFromId } from '@/lib/resumePdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// One-per-day-per-user upper bound. Greenhouse will also rate-limit us if
// a single board sees too many submissions from one IP — be a good citizen.
const DAILY_SUBMISSION_CAP = 20;

const ACTIVE_SUB_STATUSES = ['active', 'trialing', 'past_due'];

async function isUserSubscribed(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE_SUB_STATUSES } },
    select: { id: true },
  });
  return !!sub;
}

async function dailySubmissionsCount(userId: string): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  return prisma.application.count({
    where: { userId, ats: 'greenhouse', submittedAt: { gte: since } },
  });
}

export async function POST(req: NextRequest) {
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
      { error: 'subscription_required', detail: 'Greenhouse auto-submit is a PRO feature.' },
      { status: 402 },
    );
  }

  const dailyCount = await dailySubmissionsCount(userId);
  if (dailyCount >= DAILY_SUBMISSION_CAP) {
    return NextResponse.json(
      {
        error: 'submission_cap_reached',
        detail: `You've reached the ${DAILY_SUBMISSION_CAP}/day Greenhouse submission cap. Try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  // Multipart parsing — Next.js gives us req.formData() out of the box.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_multipart' }, { status: 400 });
  }

  const url = String(form.get('url') || '').trim();
  const answersRaw = String(form.get('answers') || '{}');
  const uploadedResume = form.get('resume');
  const coverLetterBlob = form.get('cover_letter');
  const resumeIdRef = (form.get('resumeId') as string) || null;
  const coverLetterIdRef = (form.get('coverLetterId') as string) || null;

  const ref = parseGreenhouseUrl(url);
  if (!ref) {
    return NextResponse.json(
      { error: 'not_greenhouse', detail: 'URL is not a Greenhouse posting.' },
      { status: 400 },
    );
  }

  // Resume source: either an uploaded file OR auto-generated from `resumeId`.
  // If neither, that's a 400.
  let resumePdf: { bytes: Buffer; filename: string };
  if (uploadedResume instanceof Blob && uploadedResume.size > 0) {
    if (uploadedResume.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'resume_too_large', detail: 'Resume PDF must be under 5 MB.' }, { status: 413 });
    }
    resumePdf = {
      bytes: Buffer.from(await uploadedResume.arrayBuffer()),
      filename: (uploadedResume as any).name || 'resume.pdf',
    };
  } else if (resumeIdRef) {
    // Confirm ownership before signing a print token.
    const owned = await prisma.resume.findFirst({
      where: { id: resumeIdRef, userId },
      select: { id: true, title: true },
    });
    if (!owned) {
      return NextResponse.json({ error: 'resume_not_found', detail: 'Resume does not belong to this user.' }, { status: 404 });
    }
    const token = signPrintToken(owned.id, 120);
    const origin = process.env.NEXT_PUBLIC_SITE_URL ||
      (req.headers.get('x-forwarded-proto') && req.headers.get('host')
        ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}`
        : 'http://localhost:3000');
    try {
      const bytes = await renderResumePdfFromId({ resumeId: owned.id, token, origin });
      const safeTitle = (owned.title || 'resume').replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 60) || 'resume';
      resumePdf = { bytes, filename: `${safeTitle}.pdf` };
    } catch (e: any) {
      return NextResponse.json(
        { error: 'auto_pdf_failed', detail: e?.message || 'Could not render the resume to PDF.' },
        { status: 500 },
      );
    }
  } else {
    return NextResponse.json(
      { error: 'missing_resume', detail: 'A resume PDF or saved resume ID is required.' },
      { status: 400 },
    );
  }

  let answers: Record<string, any>;
  try {
    answers = JSON.parse(answersRaw);
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new Error('answers_must_be_object');
    }
  } catch {
    return NextResponse.json({ error: 'invalid_answers' }, { status: 400 });
  }

  // Refetch the schema so we only forward field names Greenhouse actually
  // declared. Prevents users (or a buggy client) from sending random keys
  // that some integrations reject as 400.
  let schema;
  try {
    schema = await fetchGreenhouseSchema(ref);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'schema_unavailable', detail: e?.message || 'unknown' },
      { status: 502 },
    );
  }
  if (!schema) return NextResponse.json({ error: 'job_not_found' }, { status: 404 });

  const knownFieldNames = new Set<string>();
  // Resume + cover letter are conventionally the same names across boards.
  knownFieldNames.add('resume');
  knownFieldNames.add('cover_letter');
  for (const q of schema.questions) {
    for (const f of q.fields) knownFieldNames.add(f.name);
  }

  // Build the multipart form we'll forward to Greenhouse.
  const out = new FormData();
  for (const [k, v] of Object.entries(answers)) {
    if (!knownFieldNames.has(k)) continue;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) out.append(k, String(item));
    } else {
      out.append(k, String(v));
    }
  }
  // Always attach the resume; cover letter when present.
  out.append('resume', new Blob([resumePdf.bytes], { type: 'application/pdf' }), resumePdf.filename);
  if (coverLetterBlob instanceof Blob && coverLetterBlob.size > 0) {
    out.append('cover_letter', coverLetterBlob, (coverLetterBlob as any).name || 'cover-letter.pdf');
  }

  // Forward to Greenhouse. We never read or echo the Greenhouse credentials —
  // there are none for this endpoint; it's the public Job Board API.
  const submitUrl = greenhouseSubmitUrl(ref);
  let ghResp: Response;
  try {
    ghResp = await fetch(submitUrl, {
      method: 'POST',
      body: out,
      // Don't set Content-Type; fetch sets the multipart boundary itself.
      headers: { accept: 'application/json' },
      // 25s ceiling (slightly under our route's maxDuration).
      signal: AbortSignal.timeout?.(25_000),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'upstream_unreachable', detail: e?.message || 'fetch_failed' },
      { status: 502 },
    );
  }

  const respText = await ghResp.text();
  let respJson: any = null;
  try { respJson = JSON.parse(respText); } catch {}

  if (!ghResp.ok) {
    return NextResponse.json(
      {
        error: 'greenhouse_submit_failed',
        status: ghResp.status,
        detail:
          respJson?.error || respJson?.errors?.[0]?.message ||
          respText.slice(0, 300) || `HTTP ${ghResp.status}`,
      },
      { status: ghResp.status === 422 ? 422 : 502 },
    );
  }

  // Record the application. Persisting raw response helps debug edge cases
  // (some Greenhouse boards 200 but include a validation note in the body).
  const app = await prisma.application.create({
    data: {
      userId,
      ats: 'greenhouse',
      jobSnapshot: {
        source: url,
        title: schema.title,
        company: schema.companyName || null,
        location: schema.location || null,
      } as any,
      status: 'submitted',
      externalRef: respJson?.candidate_id ? String(respJson.candidate_id) : null,
      resumeId: resumeIdRef,
      coverLetterId: coverLetterIdRef,
      response: (respJson || { rawText: respText.slice(0, 1000) }) as any,
      submittedAt: new Date(),
    },
    select: { id: true, status: true, submittedAt: true },
  });

  return NextResponse.json({
    ok: true,
    applicationId: app.id,
    status: app.status,
    submittedAt: app.submittedAt?.toISOString() ?? null,
    remainingToday: Math.max(0, DAILY_SUBMISSION_CAP - dailyCount - 1),
  });
}
