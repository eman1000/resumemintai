// app/api/account/claim/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import pool from '../../server/db/pool';
import { adminAuth } from '@/app/api/server/auth/firebase-admin';
import {
  ensureGuestAccount,
  getStripeCustomerIdByAccountId,
  setStripeCustomerIdByAccountId,
  linkAuthUserToAccount,
  setUserEmailIfGuestOrEmpty,
  getUserIdByFirebaseUid,
  mergeGuestAccountIntoUser,
} from '../../server/db/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

async function findStripeCustomerIdByAccountIdViaStripe(accountId: string) {
  try {
    const res = await stripe.customers.search({
      query: `metadata['accountId']:'${accountId}'`,
      limit: 1,
    });
    return res.data?.[0]?.id ?? null;
  } catch {
    for await (const cust of stripe.customers.list({ limit: 100 })) {
      if ((cust.metadata as any)?.accountId === accountId) return cust.id;
    }
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const dec = await adminAuth().verifyIdToken(idToken, true);
    const uid = dec.uid;
    const email = (dec.email || '').trim().toLowerCase() || null;

    const { accountId } = (await req.json()) as { accountId?: string };
    if (!accountId) return NextResponse.json({ error: 'missing_account_id' }, { status: 400 });

    // ensure guest row (with guest email) exists
    await ensureGuestAccount(pool, accountId);

    // DB mapping → fallback to Stripe search
    let customerId = await getStripeCustomerIdByAccountId(pool, accountId);
    if (!customerId) {
      customerId = await findStripeCustomerIdByAccountIdViaStripe(accountId);
      if (customerId) await setStripeCustomerIdByAccountId(pool, accountId, customerId);
    }
    if (!customerId) return NextResponse.json({ error: 'no_stripe_customer' }, { status: 400 });

    const cust = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    await stripe.customers.update(customerId, {
      email: email || cust.email || undefined,
      metadata: { ...(cust.metadata || {}), accountId, uid },
      invoice_settings: {
        default_payment_method: cust.invoice_settings?.default_payment_method || undefined,
      },
    });

    try {
  await linkAuthUserToAccount(pool, uid, accountId);
} catch (err: any) {
  // UID already bound elsewhere → merge guest into existing (survivor)
  const existingUserId = await getUserIdByFirebaseUid(pool, uid);
  if (!existingUserId) throw err;

  const { adoptedCustomerId } = await mergeGuestAccountIntoUser(pool, accountId, existingUserId);

  // Determine the survivor's customerId after merge
  const customerId =
    adoptedCustomerId || (await getStripeCustomerIdByAccountId(pool, existingUserId));

  // Sync Stripe metadata/email to survivor
  if (customerId) {
    const cust = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    await stripe.customers.update(customerId, {
      email: email || cust.email || undefined,
      metadata: { ...(cust.metadata || {}), accountId: existingUserId, uid },
    });
  }

  if (email) await setUserEmailIfGuestOrEmpty(pool, existingUserId, email);

  return NextResponse.json({
    ok: true,
    accountId: existingUserId,
    customerId: customerId || null,
    uid,
    email: email || null,
    merged: true,
  });
}

    if (email) await setUserEmailIfGuestOrEmpty(pool, accountId, email);

    return NextResponse.json({ ok: true, accountId, customerId, uid, email: email || cust.email || null });
  } catch (e: any) {
    console.error('[account/claim] error', e);
    const status = e?.status ?? 500;
    return NextResponse.json({ error: 'claim_failed', detail: e?.message || 'unexpected_error' }, { status });
  }
}
