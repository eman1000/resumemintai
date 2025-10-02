// app/api/billing/activate/route.ts
import { adminAuth } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

async function findOrCreateCustomer(uid: string) {
  try {
    const found = await stripe.customers.search({
      query: `metadata['accountId']:'${uid}'`,
      limit: 1,
    });
    if (found.data[0]) return found.data[0];
  } catch {}
  return stripe.customers.create({ metadata: { accountId: uid } });
}

async function getActiveOrTrialingSub(customerId: string) {
  try {
    const res = await stripe.subscriptions.search({
      query: `customer:"${customerId}" AND (status:"active" OR status:"trialing")`,
      limit: 1,
    });
    return res.data[0] ?? null;
  } catch {
    const res = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
    return res.data.find(s => s.status === 'active' || s.status === 'trialing') ?? null;
  }
}

export async function POST(req: Request) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) return Response.json({ error: 'missing_auth' }, { status: 401 });

    const { priceId, setupIntentId } = (await req.json()) as {
      priceId: string;
      setupIntentId: string; // seti_...
    };
    if (!priceId || !setupIntentId) {
      return Response.json({ error: 'missing_params' }, { status: 400 });
    }

    const { uid } = await adminAuth.verifyIdToken(idToken);
    const customer = await findOrCreateCustomer(uid);

    // If already subscribed, short-circuit.
    const existing = await getActiveOrTrialingSub(customer.id);
    if (existing) {
      return Response.json({
        alreadySubscribed: true,
        subscriptionId: existing.id,
        status: existing.status,
        cancelAtPeriodEnd: !!existing.cancel_at_period_end,
        // @ts-ignore
        currentPeriodEnd: existing.current_period_end
        // @ts-ignore
          ? new Date(existing.current_period_end * 1000).toISOString()
          : null,
        customerId: customer.id,
      });
    }

    // Retrieve the SetupIntent by ID
    const si = await stripe.setupIntents.retrieve(setupIntentId);

    // Ownership sanity checks (optional)
    if (si.customer && typeof si.customer === 'string' && si.customer !== customer.id) {
      return Response.json({ error: 'customer_mismatch' }, { status: 403 });
    }
    if (si.status !== 'succeeded' && si.status !== 'processing') {
      return Response.json({ error: 'setup_incomplete', status: si.status }, { status: 400 });
    }

    const pm = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
    if (!pm) return Response.json({ error: 'no_payment_method' }, { status: 400 });

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);

    // **Deterministic idempotency** per (uid + setupIntent + priceId)
    const idemKey = `activate:${uid}:${setupIntentId}:${priceId}`;

    const sub = await stripe.subscriptions.create(
      {
        customer: customer.id,
        items: [{ price: priceId }],
        default_payment_method: pm,
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        trial_settings: trialDays > 0 ? { end_behavior: { missing_payment_method: 'cancel' } } : undefined,
        payment_behavior: 'allow_incomplete',
        metadata: { accountId: uid, activated_by_setup_intent: setupIntentId },
      },
      { idempotencyKey: idemKey }
    );

    return Response.json({
      subscriptionId: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      // @ts-ignore
      currentPeriodEnd: sub.current_period_end
      // @ts-ignore
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      customerId: customer.id,
    });
  } catch (e: any) {
    console.error('[billing/activate] error', e);
    return Response.json({ error: 'activate_failed', detail: e?.message }, { status: 500 });
  }
}
