// app/api/applications/route.ts
//
// GET: list the current user's job applications, newest first.
// POST: manually record an application (for ATS hosts where we don't have
//       an automatic submit pipeline — Ashby, Workable, etc.).

import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set([
  'draft',
  'submitted',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
]);

export async function GET() {
  try {
    const user = await getUserFromRequest();

    const rows = await prisma.application.findMany({
      where: { user: { firebaseUid: user.uid } },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        ats: true,
        jobSnapshot: true,
        status: true,
        externalRef: true,
        resumeId: true,
        coverLetterId: true,
        notes: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const items = rows.map((r) => ({
      id: r.id,
      ats: r.ats,
      jobSnapshot: r.jobSnapshot,
      status: r.status,
      externalRef: r.externalRef,
      resumeId: r.resumeId,
      coverLetterId: r.coverLetterId,
      notes: r.notes,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items, count: items.length }, { status: 200 });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/applications]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

type CreateBody = {
  ats?: string;
  status?: string;
  jobSnapshot?: {
    source?: string;
    title?: string;
    company?: string;
    location?: string;
    postedAt?: string;
  };
  resumeId?: string | null;
  coverLetterId?: string | null;
  notes?: string | null;
};

export async function POST(req: Request) {
  try {
    const u = await getUserFromRequest();
    const row = await prisma.user.findUnique({
      where: { firebaseUid: u.uid },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ error: 'no_user' }, { status: 403 });
    const userId = row.id;

    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const ats = (body.ats || 'manual').toString().toLowerCase().slice(0, 32);
    const status = body.status && VALID_STATUSES.has(body.status) ? body.status : 'applied';
    const snapshot = body.jobSnapshot ?? {};

    // Soft de-dupe: if the user already has an application for the same
    // (ats, source) within the last 24h, return the existing row instead of
    // creating a duplicate.
    if (snapshot.source) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dup = await prisma.application.findFirst({
        where: {
          userId,
          ats,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, jobSnapshot: true, createdAt: true },
      });
      if (dup && (dup.jobSnapshot as any)?.source === snapshot.source) {
        return NextResponse.json(
          { id: dup.id, status: dup.status, duplicate: true },
          { status: 200 },
        );
      }
    }

    const created = await prisma.application.create({
      data: {
        userId,
        ats,
        status,
        jobSnapshot: snapshot as any,
        resumeId: body.resumeId ?? null,
        coverLetterId: body.coverLetterId ?? null,
        notes: body.notes ?? null,
        submittedAt: status === 'submitted' ? new Date() : null,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json({
      id: created.id,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/applications]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
