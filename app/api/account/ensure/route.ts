// app/api/account/ensure/route.ts
import { adminAuth } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../server/db/pool';
import { ensureDbUserByFirebaseUid } from '../../server/db/user';
import { run } from '../../server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIVE = ['active','trialing','past_due'] as const;

async function hasActiveSubByUserId(userId: string) {
  const { rows } = await run(pool, (c) =>
    c.query(
      `select 1 from public.subscriptions where user_id = $1 and status = any($2::text[]) limit 1`,
      [userId, ACTIVE]
    ),
  );
  return !!rows[0];
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
