// app/api/jobs/greenhouse/schema/route.ts
//
// Returns the Greenhouse application schema for a given job URL, plus a
// user-prefilled "answers" object so the UI can render the form ready-to-go.
// Pre-fills name/email/phone/LinkedIn/location from the user's most-recent
// resume's personalDetails. Custom questions are left blank — the user reviews
// before submission. (We never auto-answer quantitative questions like
// "Years of experience"; that's a misrepresentation risk.)
//
// Body / Query: ?url=<greenhouse apply URL>
// Returns: {
//   ref: { boardToken, jobId },
//   schema: GreenhouseJobSchema,
//   prefill: { firstName, lastName, email, phone, linkedIn, location },
//   resumeIdSuggested: string|null,
//   coverLetterIdSuggested: string|null
// }

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';
import { parseGreenhouseUrl, fetchGreenhouseSchema } from '@/lib/greenhouse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function stripHtml(s?: any): string {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickPdValue(values: any, key: string): string {
  if (!values) return '';
  if (Array.isArray(values)) return '';
  if (typeof values === 'object') return stripHtml(values[key] || '');
  return '';
}

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  try {
    const u = await getUserFromRequest();
    const row = await prisma.user.findUnique({ where: { firebaseUid: u.uid }, select: { id: true } });
    userId = row?.id ?? null;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 403 });

  const url = req.nextUrl.searchParams.get('url') || '';
  const ref = parseGreenhouseUrl(url);
  if (!ref) {
    return NextResponse.json(
      { error: 'not_greenhouse', detail: 'URL does not look like a Greenhouse posting.' },
      { status: 400 },
    );
  }

  let schema;
  try {
    schema = await fetchGreenhouseSchema(ref);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'schema_fetch_failed', detail: e?.message || 'unknown' },
      { status: 502 },
    );
  }
  if (!schema) {
    return NextResponse.json({ error: 'job_not_found' }, { status: 404 });
  }

  // Pull personal details + suggest tailored kit (if any exists for this URL).
  const latestResume = await prisma.resume.findFirst({
    where: { userId, archived: false },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, data: true },
  });

  // Look for a tailored kit matching this source URL.
  const tailoredResume = await prisma.resume.findFirst({
    where: {
      userId,
      archived: false,
      tailoredForJob: { path: ['source'], equals: url },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  const tailoredCl = tailoredResume
    ? await prisma.coverLetter.findFirst({
        where: { userId, archived: false, resumeId: tailoredResume.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      })
    : null;

  // Build prefill from the most-recent resume's PD section.
  const data: any = latestResume?.data || {};
  const pd = (data?.sections || []).find(
    (s: any) => String(s?.key || '').toLowerCase() === 'personaldetails',
  );
  const v: any = pd?.records?.[0]?.values || {};
  const prefill = {
    firstName: pickPdValue(v, 'givenName'),
    lastName: pickPdValue(v, 'familyName'),
    email: pickPdValue(v, 'email'),
    phone: pickPdValue(v, 'phone'),
    linkedIn: pickPdValue(v, 'linkedin'),
    location: [pickPdValue(v, 'city'), pickPdValue(v, 'address')].filter(Boolean).join(', '),
  };

  return NextResponse.json({
    ref,
    schema,
    prefill,
    resumeIdSuggested: tailoredResume?.id ?? latestResume?.id ?? null,
    coverLetterIdSuggested: tailoredCl?.id ?? null,
  });
}
