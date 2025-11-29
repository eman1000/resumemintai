import { adminAuth } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: '2024-06-20',
});

type Body = { priceId: string };

const ACTIVEISH = new Set<Stripe.Subscription.Status>([
  'trialing', 'active', 'past_due'
]);

// statuses that mean "created but not confirmed yet"
const PENDINGISH = new Set<Stripe.Subscription.Status>([
  'incomplete'
]);

async function findOrCreateCustomer(uid: string) {
  // Prefer customer search by metadata (turn on in Stripe dashboard)
  try {
    const res = await stripe.customers.search({
      query: `metadata['accountId']:'${uid}'`,
      limit: 1,
    });
    if (res.data[0]) return res.data[0];
  } catch { /* ignore */ }

  return stripe.customers.create({ metadata: { accountId: uid } });
}

async function findExistingSubForCustomer(customerId: string) {
  // Subscriptions Search is best; if disabled, fall back to list
  try {
    const res = await stripe.subscriptions.search({
      // include all statuses, newest first
      query: `customer:'${customerId}' AND status:'all'`,
      limit: 5,
    });
    // sort newest first by created
    const subs = res.data.sort((a,b) => b.created - a.created);
    return subs;
  } catch {
    const res = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
      expand: ['data.latest_invoice.payment_intent','data.pending_setup_intent'],
    });
    return res.data.sort((a,b) => b.created - a.created);
  }
}

export async function POST(req: Request) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    const { priceId } = (await req.json()) as Body;

    if (!idToken) return Response.json({ error: 'missing_auth' }, { status: 401 });
    if (!priceId) return Response.json({ error: 'missing_price' }, { status: 400 });

    const { uid } = await adminAuth.verifyIdToken(idToken);
    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);

    // 1) Customer
    const customer = await findOrCreateCustomer(uid);

    // 2) Reuse existing subscription when possible
    const existing = await findExistingSubForCustomer(customer.id);

    // (a) If any subscription is already active/trialing/past_due → stop here
    const live = existing.find(s => ACTIVEISH.has(s.status));
    if (live) {
      return Response.json({
        alreadySubscribed: true as const,
        subscriptionId: live.id,
        status: live.status,
        customerId: customer.id,
        cancelAtPeriodEnd: !!live.cancel_at_period_end,
        // @ts-ignore
        currentPeriodEnd: live.current_period_end ? new Date(live.current_period_end * 1000).toISOString() : null,
      });
    }

    // (b) If there’s an incomplete subscription (awaiting confirmation), reuse its client_secret
    const pending = existing.find(s => PENDINGISH.has(s.status));
    if (pending) {
      const pi = (pending.latest_invoice as any)?.payment_intent as Stripe.PaymentIntent | undefined;
      const si = pending.pending_setup_intent as Stripe.SetupIntent | undefined;

      if (trialDays > 0) {
        if (si?.client_secret) {
          return Response.json({
            alreadySubscribed: false as const,
            mode: 'setup' as const,
            clientSecret: si.client_secret,
            subscriptionId: pending.id,
            customerId: customer.id,
          });
        }
      } else {
        if (pi?.client_secret) {
          return Response.json({
            alreadySubscribed: false as const,
            mode: 'payment' as const,
            clientSecret: pi.client_secret,
            subscriptionId: pending.id,
            customerId: customer.id,
          });
        }
      }

      // If we got here, expand wasn’t present; refetch with expand
      const re = await stripe.subscriptions.retrieve(pending.id, {
        expand: ['latest_invoice.payment_intent','pending_setup_intent'],
      });
      const pi2 = (re.latest_invoice as any)?.payment_intent as Stripe.PaymentIntent | undefined;
      const si2 = re.pending_setup_intent as Stripe.SetupIntent | undefined;

      if (trialDays > 0 && si2?.client_secret) {
        return Response.json({
          alreadySubscribed: false as const,
          mode: 'setup' as const,
          clientSecret: si2.client_secret,
          subscriptionId: re.id,
          customerId: customer.id,
        });
      }
      if (!trialDays && pi2?.client_secret) {
        return Response.json({
          alreadySubscribed: false as const,
          mode: 'payment' as const,
          clientSecret: pi2.client_secret,
          subscriptionId: re.id,
          customerId: customer.id,
        });
      }

      // If still no client secret, as a last resort cancel this zombie and fall through to create a fresh one
      try {
        await stripe.subscriptions.cancel(pending.id);
      } catch {/* ignore */}
    }

    // 3) No usable existing sub → create one
    if (trialDays > 0) {
      const sub = await stripe.subscriptions.create(
        {
          customer: customer.id,
          items: [{ price: priceId }],
          trial_period_days: trialDays,
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['pending_setup_intent'],
          metadata: { accountId: uid },
        },
        { idempotencyKey: crypto.randomUUID() }
      );

      const si = sub.pending_setup_intent as Stripe.SetupIntent | null;
      if (!si?.client_secret) {
        return Response.json({ error: 'no_setup_intent' }, { status: 500 });
      }

      return Response.json({
        alreadySubscribed: false as const,
        mode: 'setup' as const,
        clientSecret: si.client_secret,
        subscriptionId: sub.id,
        customerId: customer.id,
      });
    }

    // no-trial
    const sub = await stripe.subscriptions.create(
      {
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { accountId: uid },
      },
      { idempotencyKey: crypto.randomUUID() }
    );

    const pi = (sub.latest_invoice as any)?.payment_intent as Stripe.PaymentIntent | undefined;
    if (!pi?.client_secret) {
      return Response.json({ error: 'no_payment_intent' }, { status: 500 });
    }

    return Response.json({
      alreadySubscribed: false as const,
      mode: 'payment' as const,
      clientSecret: pi.client_secret,
      subscriptionId: sub.id,
      customerId: customer.id,
    });
  } catch (e: any) {
    console.error('[create-subscription] error', e);
    return Response.json({ error: 'create_subscription_failed', detail: e?.message }, { status: 500 });
  }
}
