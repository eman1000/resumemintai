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
    send_to: 'AW-17589141195/rl8dCKuOv6MbEMv9k8NB',
    value,
    currency,
    transaction_id: transactionId,
  });
}
