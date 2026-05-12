// app/api/account/ensure/route.ts
import { adminAuth } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbUserByFirebaseUid } from '../../server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIVE = ['active', 'trialing', 'past_due'];

async function hasActiveSubByUserId(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE } },
    select: { id: true },
  });
  return !!sub;
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

    const dec = await adminAuth.verifyIdToken(idToken);
    const firebaseUid = dec.uid;
    const email = (dec.email || '').toLowerCase() || null;

    const userId = await ensureDbUserByFirebaseUid(firebaseUid, email);
    const subscribed = await hasActiveSubByUserId(userId);

    return NextResponse.json({
      userId,
      firebaseUid,
      primaryEmail: email || '',
      subscribed,
    });
  } catch (e: any) {
    console.error('[account/ensure] error', e);
    return NextResponse.json({ error: 'ensure_failed' }, { status: 500 });
  }
}
