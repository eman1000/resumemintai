// Consumer plans shown on /pricing and charged by the in-app checkout. Single source of truth so the
// plan a visitor picks on /pricing is the plan Stripe actually charges.
export type PlanKey = 'monthly' | 'quarterly' | 'annual';

export const PLANS: Record<PlanKey, { label: string; perMonth: string; billed: string; priceId: string }> = {
  monthly: { label: 'Monthly', perMonth: '$19.99', billed: 'Billed $19.99 every month', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '' },
  quarterly: { label: 'Quarterly', perMonth: '$14.99', billed: 'Billed $44.97 every 3 months', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_QUARTERLY || '' },
  annual: { label: 'Annual', perMonth: '$9.99', billed: 'Billed $119.88 per year', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || '' },
};

const KEY = 'rm_plan';

export function getSelectedPlan(): PlanKey {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    if (v === 'monthly' || v === 'quarterly' || v === 'annual') return v;
  } catch { /* storage blocked */ }
  return 'monthly';
}

export function setSelectedPlan(plan: PlanKey) {
  try { window.localStorage.setItem(KEY, plan); } catch { /* storage blocked */ }
}
