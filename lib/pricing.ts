export const TRIAL_DAYS = 14;

export type BillingPeriod = 'monthly' | 'quarterly' | 'annual';

export interface PriceConfig {
  priceId: string;
  amount: number;
  displayAmount: string;
  period: string;
  billedNote: string;
}

// Stripe price IDs - update these with actual Stripe price IDs when created
export const PRICE_CONFIGS: Record<BillingPeriod, PriceConfig> = {
  monthly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '',
    amount: 19.99,
    displayAmount: '€19.99',
    period: '/month',
    billedNote: '',
  },
  quarterly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_QUARTERLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '',
    amount: 14.99,
    displayAmount: '€14.99',
    period: '/month',
    billedNote: 'Billed €44.97 every 3 months',
  },
  annual: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '',
    amount: 9.99,
    displayAmount: '€9.99',
    period: '/month',
    billedNote: 'Billed €119.88 per year',
  },
};

export function getPriceConfig(period: BillingPeriod): PriceConfig {
  return PRICE_CONFIGS[period];
}
