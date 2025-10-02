// app/api/account/ensure/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { generateExternalUid } from '@/lib/externalUid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIVE = new Set(['active','trialing','past_due']);

async function hasActiveSub(accountId: string) {
  const q1 = await adminDb.collection('stripeSubs').where('accountId','==',accountId).limit(20).get();
  for (const d of q1.docs) if (ACTIVE.has(String(d.get('status') || ''))) return true;
  // (Optional) also check a 'subscriptions' collection if you keep another cache
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // who is this?
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    let accountId = '';
    let primaryEmail = '';
console.log("FFFFFFF", idToken)
    if (idToken) {
      try {
        const dec = await adminAuth.verifyIdToken(idToken);
        console.log("dec", dec)

        accountId = dec.uid;
                console.log("accountId", accountId)

        primaryEmail = dec.email || '';
      } catch {}
    }
                    console.log("accountId2", accountId)


    // prefer auth UID; else external_uid; never create spurious docs each call
    const ext = req.cookies.get('external_uid')?.value || '';
    let ref;
    if (accountId) {
      ref = adminDb.collection('accounts').doc(accountId);
                          console.log("ref accountId", ref)

    } else if (ext) {
      const byExt = await adminDb.collection('accounts').where('externalUid','==',ext).limit(1).get();
      console.log("byExt", byExt)
      ref = byExt.empty ? adminDb.collection('accounts').doc() : byExt.docs[0].ref;
    } else {
      // set a durable external uid once
      ref = adminDb.collection('accounts').doc();
    }

    const snap = await ref.get();
    const now = new Date();
    const data = snap.exists ? snap.data()! : {};
            console.log("data", data)

    if (!data.externalUid) data.externalUid = generateExternalUid();
    if (!data.createdAt) data.createdAt = now;
    data.updatedAt = now;
    if (primaryEmail) data.primaryEmail = primaryEmail.toLowerCase();

    await ref.set(data, { merge: true });
    const resolvedId = accountId || ref.id;

    const subscribed = await hasActiveSub(resolvedId);

    return NextResponse.json({
      accountId: resolvedId,
      primaryEmail: data.primaryEmail || '',
      externalUid: data.externalUid,
      subscribed,
    });
  } catch (e: any) {
    console.error('[account/ensure] error', e);
    return NextResponse.json({ error: 'ensure_failed' }, { status: 500 });
  }
}
