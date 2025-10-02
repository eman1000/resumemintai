// app/api/checkout/start/route.ts
import { adminAuth } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

function getBaseUrl(req: Request) {
  // Prefer explicit env override
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/+$/, '');

  // Build from headers (works on Vercel & local)
  // @ts-ignore - Next adds headers on the Web Request
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (host) return `${proto}://${host}`;

  // Last resort: derive from this request URL
  try {
    const origin = new URL(req.url).origin;
    if (origin && /^https?:\/\//i.test(origin)) return origin;
  } catch {}

  // Fallback for local dev
  return 'http://localhost:3000';
}

async function findOrCreateCustomer(uid: string) {
  try {
    const r = await stripe.customers.search({ query: `metadata['accountId']:'${uid}'`, limit: 1 });
    if (r.data[0]) return r.data[0];
  } catch {}
  return stripe.customers.create({ metadata: { accountId: uid } });
}

async function hasBillableSub(customerId: string) {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
  const billable = new Set(['active','trialing','past_due','incomplete','incomplete_expired']);
  return subs.data.find(s => billable.has(s.status));
}

export async function POST(req: Request) {
  try {
    const authz = req.headers.get('authorization') || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) return Response.json({ error: 'missing_auth' }, { status: 401 });

    const { uid } = await adminAuth.verifyIdToken(idToken);
    const { priceId } = await req.json() as { priceId: string };
    if (!priceId) return Response.json({ error: 'missing_price' }, { status: 400 });

    const baseUrl = getBaseUrl(req); // <<— ALWAYS absolute with http/https
    const customer = await findOrCreateCustomer(uid);

    const existing = await hasBillableSub(customer.id);
    if (existing) {
      return Response.json({
        alreadySubscribed: true,
        customerId: customer.id,
        subscriptionId: existing.id,
        status: existing.status,
      });
    }

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? 0);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      client_reference_id: uid,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: 'always',
      subscription_data: {
        trial_period_days: trialDays || undefined,
        metadata: { accountId: uid },
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/billing/return`,
      cancel_url: `${baseUrl}/landing/vtdft`,
    }, { idempotencyKey: crypto.randomUUID() });

    return Response.json({ url: session.url });
  } catch (e:any) {
    console.error('[checkout/start] error', e);
    return Response.json({ error: 'checkout_start_failed', detail: e?.message }, { status: 500 });
  }
}
