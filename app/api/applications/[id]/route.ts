// app/api/applications/[id]/route.ts
//
// PATCH: update status and/or notes for one of the current user's applications.
// DELETE: remove a draft application (only 'draft' status — submitted apps stay
// in the audit trail).

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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest();

    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
      notes?: string | null;
    };

    const data: { status?: string; notes?: string | null } = {};
    if (typeof body.status === 'string') {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
      }
      data.status = body.status;
    }
    if (typeof body.notes === 'string' || body.notes === null) {
      data.notes = body.notes;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'no_fields' }, { status: 400 });
    }

    const existing = await prisma.application.findFirst({
      where: { id: params.id, user: { firebaseUid: user.uid } },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updated = await prisma.application.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        status: true,
        notes: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      notes: updated.notes,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('[PATCH /api/applications/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest();

    const existing = await prisma.application.findFirst({
      where: { id: params.id, user: { firebaseUid: user.uid } },
      select: { id: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'cannot_delete_submitted' }, { status: 409 });
    }

    await prisma.application.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.name === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('[DELETE /api/applications/:id]', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
