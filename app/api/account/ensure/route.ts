// app/api/account/ensure/route.ts
import { adminAuth } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDbUserByFirebaseUid } from '../../server/db/user';
import { hasActiveRecruiterSub } from '@/lib/recruiterBilling';
import { forwardPlenqorLead } from '@/lib/plenqorLeads';
import { alertSignup } from '@/lib/chatAlerts';

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
    const [subscribed, recruiterSubscribed, dbUser] = await Promise.all([
      hasActiveSubByUserId(userId),
      hasActiveRecruiterSub(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { userType: true, createdAt: true } }),
    ]);

    // A row created moments ago means this is the first login = a new signup.
    const isNewUser = !!(dbUser?.createdAt && Date.now() - new Date(dbUser.createdAt).getTime() < 2 * 60_000);
    // ensure() is called several times on first login; only the call that claims the
    // welcome flag sends the Chat alert.
    let firstClaim = false;
    if (isNewUser) {
      try {
        const claimed = await prisma.$queryRaw<Array<{ id: string }>>`UPDATE public.users SET welcome_alerted_at = now() WHERE id = ${userId}::uuid AND welcome_alerted_at IS NULL RETURNING id`;
        firstClaim = claimed.length > 0;
      } catch (e) { console.warn('[account/ensure] welcome flag', (e as Error)?.message); }
    }
    if (firstClaim) {
      void alertSignup({ email, userId, userType: dbUser.userType, country: req.headers.get('x-vercel-ip-country') });
      forwardPlenqorLead({ source: 'resumemint-signup', email, country: req.headers.get('x-vercel-ip-country'), status: 'new', notes: `Signed up (${dbUser.userType || 'candidate'})`, referrer: req.headers.get('referer') });
    }
    return NextResponse.json({
      isNewUser,
      userId,
      firebaseUid,
      primaryEmail: email || '',
      subscribed,
      recruiterSubscribed,
      userType: dbUser?.userType || 'candidate',
    });
  } catch (e: any) {
    console.error('[account/ensure] error', e);
    return NextResponse.json({ error: 'ensure_failed' }, { status: 500 });
  }
}
