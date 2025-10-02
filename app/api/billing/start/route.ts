import { adminAuth } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

async function findOrCreateCustomer(uid: string) {
  // Best-effort reuse by metadata (enable Customer Search in Stripe)
  try {
    const found = await stripe.customers.search({ query: `metadata['accountId']:'${uid}'`, limit: 1 });
    if (found.data[0]) return found.data[0];
  } catch {}
  return stripe.customers.create({ metadata: { accountId: uid } });
}

export async function POST(req: Request) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) return Response.json({ error: 'missing_auth' }, { status: 401 });

    const dec = await adminAuth.verifyIdToken(idToken);
    const uid = dec.uid;

    const customer = await findOrCreateCustomer(uid);

    // One click = one SI (created on demand; no subscription yet)
    const si = await stripe.setupIntents.create(
      {
        customer: customer.id,
        usage: 'off_session',
        payment_method_types: ['card', 'link'],
        metadata: { accountId: uid },
      },
      { idempotencyKey: crypto.randomUUID() }
    );

    return Response.json({ clientSecret: si.client_secret!, customerId: customer.id });
  } catch (e: any) {
    console.error('[billing/start] error', e);
    return Response.json({ error: 'start_failed', detail: e?.message }, { status: 500 });
  }
}
