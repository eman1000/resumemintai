// lightweight, first-party attribution helpers

type Attribution = {
  src: 'google_ads' | 'facebook' | 'propeller' | 'other';
  clickId?: string; // gclid / gbraid / wbraid / fbclid etc.
  utm?: Record<string, string>;
  ts: number; // epoch ms
};

const COOKIE = 'rm_attrib';
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90d

export function captureAttributionFromUrl(url: URL) {
  const sp = url.searchParams;
  const gclid = sp.get('gclid');
  const gbraid = sp.get('gbraid');
  const wbraid = sp.get('wbraid');
  const fbclid = sp.get('fbclid');
  const utm_source = sp.get('utm_source') || '';
  const utm_medium = sp.get('utm_medium') || '';
  const utm_campaign = sp.get('utm_campaign') || '';

  let src: Attribution['src'] = 'other';
  let clickId: string | undefined;

  if (gclid || gbraid || wbraid || utm_source.toLowerCase() === 'google') {
    src = 'google_ads';
    clickId = gclid || gbraid || wbraid || undefined;
  } else if (fbclid || utm_source.toLowerCase() === 'facebook') {
    src = 'facebook';
    clickId = fbclid || undefined;
  } else if (utm_source.toLowerCase().includes('propeller')) {
    src = 'propeller';
  }

  // Only set if we have a meaningful signal (or a new campaign tag)
  if (src !== 'other' || utm_source || utm_medium || utm_campaign) {
    const payload: Attribution = {
      src,
      clickId,
      utm: {
        source: utm_source || undefined,
        medium: utm_medium || undefined,
        campaign: utm_campaign || undefined,
      },
      ts: Date.now(),
    };
    const str = encodeURIComponent(JSON.stringify(payload));
    document.cookie = `${COOKIE}=${str}; Max-Age=${MAX_AGE_MS / 1000}; Path=/; SameSite=Lax`;
    try {
      localStorage.setItem(COOKIE, str);
    } catch {}
  }
}

export function getAttribution(): Attribution | null {
  try {
    const ls = localStorage.getItem(COOKIE);
    const raw =
      ls ||
      (document.cookie.split('; ').find((x) => x.startsWith(COOKIE + '=')) || '').split('=')[1];
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw)) as Attribution;
    if (Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function shouldFireGoogleConversion(): boolean {
  const a = getAttribution();
  if (!a) return false;
  if (Date.now() - a.ts > MAX_AGE_MS) return false;
  return a.src === 'google_ads';
}

// simple client-side dedupe per subscription
export function markFiredOnce(subId: string): boolean {
  try {
    const key = `conv_fired:${subId}`;
    if (localStorage.getItem(key)) return false; // already fired
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return true; // if storage blocked, allow fire (server should dedupe)
  }
}
