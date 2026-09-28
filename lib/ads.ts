// /lib/ads.ts
export function fireAdsConversion({ sendTo, value, currency, transactionId }: {
  sendTo: string;          // e.g. 'AW-17589141195/rl8dCKuOv6MbEMv9k8NB'
  value: number;
  currency: string;        // 'EUR'
  transactionId?: string;  // unique if you provide it; Ads dedupes on this
}) {
  return new Promise<void>((resolve) => {
    if (!(window as any).gtag) return resolve(); // no-op if gtag not ready

    const done = () => resolve();

    (window as any).gtag('event', 'conversion', {
      send_to: sendTo,
      value,
      currency,
      transaction_id: transactionId,
      transport_type: 'beacon',
      event_callback: done,
    });

    // Fallback in case the callback never fires (adblockers, etc)
    setTimeout(done, 800);
  });
}

// lib/ads.ts – GTM version
export async function fireAdsConversionDL({
  value, currency, transactionId,
}: { value:number; currency:string; transactionId?:string }) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'ads_conversion',
    value,
    currency,
    transaction_id: transactionId,
  });
  // Give GTM a moment to dispatch (or only fire on /billing/return)
  await new Promise(r => setTimeout(r, 600));
}

export function fireAdsConversionDirect({value, currency, transactionId}:{value:number;currency:string;transactionId?:string}) {
  const gtag = (window as any).gtag;
  if (typeof gtag !== 'function' || (window as any).__adsConvFired) return;
  (window as any).__adsConvFired = true;
  gtag('event', 'conversion', {
    send_to: process.env.NEXT_PUBLIC_ADS_PURCHASE_LABEL || 'AW-18450154360/PURCHASE_LABEL_UNSET',
    value,
    currency,
    transaction_id: transactionId,
  });
}

/** Google Ads "ResumeMint signup" conversion — fired once per browser on the first login of a new account. */
export function fireSignupConversion(userId?: string) {
  if (typeof window === 'undefined') return;
  const gtag = (window as any).gtag;
  const sendTo = process.env.NEXT_PUBLIC_ADS_SIGNUP_LABEL;
  if (typeof gtag !== 'function' || !sendTo) return;
  try {
    const key = 'rm_signup_conv';
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, userId || '1');
  } catch { /* storage blocked — fire anyway */ }
  gtag('event', 'conversion', { send_to: sendTo, transaction_id: userId });
  gtag('event', 'sign_up', { method: 'firebase' });
}
