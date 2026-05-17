// app/api/applications/route.ts
//
// GET: list the current user's job applications, newest first.

import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/server/auth/getUserFromRequest';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
