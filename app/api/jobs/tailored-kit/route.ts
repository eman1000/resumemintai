// app/api/jobs/tailored-kit/route.ts
//
// Two read-only helpers for the jobs page:
//
// GET  ?source=<url>  → look up an existing tailored kit (resume + cover
//                       letter) for the given job source URL. Returns
//                       { resumeId, coverLetterId, title, tailoredAt } | null.
//
// GET  ?probe=resume  → "does the caller have any non-empty resume that
//                       could be tailored?". Returns { hasResume, hasContent,
//                       count }. Used to gate the Tailor button before the
//                       user clicks it.
//
// Auth required. No subscription gate — this is a read.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function stripHtml(s?: string) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

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

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);

  // Probe path: tells the UI whether to render the Tailor CTA at all.
  if (searchParams.get('probe') === 'resume') {
    const recent = await prisma.resume.findMany({
      where: { userId, archived: false },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, data: true },
      take: 10,
    });
    const hasContent = recent.some((r) => hasMeaningfulResumeContent(r.data));
    return NextResponse.json({
      hasResume: recent.length > 0,
      hasContent,
      count: recent.length,
    });
  }

  // Lookup path: existing tailored kit for this job.source.
  const source = (searchParams.get('source') || '').trim();
  if (!source) {
    return NextResponse.json({ error: 'missing_source' }, { status: 400 });
  }

  // tailoredForJob is JSONB. Match the source URL exactly. We want the most
  // recent kit for this job (a user may have re-tailored a job).
  const resume = await prisma.resume.findFirst({
    where: {
      userId,
      archived: false,
      // Prisma JSON filter — equivalent to: data->>'source' = $source
      tailoredForJob: { path: ['source'], equals: source },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, tailoredForJob: true, updatedAt: true },
  });
  if (!resume) return NextResponse.json({ kit: null });

  const coverLetter = await prisma.coverLetter.findFirst({
    where: {
      userId,
      archived: false,
      resumeId: resume.id,
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true },
  });

  const meta = (resume.tailoredForJob as any) || {};
  return NextResponse.json({
    kit: {
      resumeId: resume.id,
      resumeTitle: resume.title,
      coverLetterId: coverLetter?.id ?? null,
      coverLetterTitle: coverLetter?.title ?? null,
      tailoredAt: meta.tailoredAt || resume.updatedAt?.toISOString?.() || null,
    },
  });
}
