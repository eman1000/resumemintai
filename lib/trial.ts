// Single source of truth for the free-trial length shown anywhere on the site.
// This MUST match STRIPE_TRIAL_DAYS on the server. The two drifted before (every
// page promised 14 days while Stripe charged after 1), so no surface should
// hardcode a number again — import from here instead.
export const TRIAL_DAYS = Math.max(0, Math.trunc(Number(process.env.NEXT_PUBLIC_TRIAL_DAYS ?? '1')) || 0);

/** e.g. "1-day free trial", "7-day free trial" */
export const TRIAL_PHRASE = TRIAL_DAYS > 0 ? `${TRIAL_DAYS}-day free trial` : 'no free trial';

/** e.g. "1 day", "7 days" — for sentences like "after your 1 day trial". */
export const TRIAL_LENGTH = TRIAL_DAYS === 1 ? '1 day' : `${TRIAL_DAYS} days`;
