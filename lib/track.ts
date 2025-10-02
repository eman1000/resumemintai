// lib/track.ts
let sessionId: string | null = null;
function getSessionId() {
  if (typeof window === 'undefined') return null;
  if (!sessionId) {
    sessionId = localStorage.getItem('sess_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sess_id', sessionId);
    }
  }
  return sessionId;
}

type TrackOpts = {
  event: 'impression' | 'checkout_start' | 'sale' | string;
  props?: Record<string, any>;
  dedupeKey?: string | null;   // pass setup_intent / subscription id for idempotency
  includeAuth?: boolean;       // default true
};

export async function track({ event, props = {}, dedupeKey, includeAuth = true }: TrackOpts) {
  try {
    // 1) Push to GA4 via GTM
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event, ...props });
    }

    // 2) Persist in Firestore via your API
    const sid = getSessionId();
    const body = {
      event,
      props: { ...props, sid },
      ts: Date.now(),
      dedupeKey: dedupeKey ?? null,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const idToken = (props as any)?._idToken as string | undefined;
    if (includeAuth && idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const json = JSON.stringify(body);

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([json], { type: 'application/json' });
      if (navigator.sendBeacon('/api/track', blob)) return;
    }

    await fetch('/api/track', { method: 'POST', headers, body: json, keepalive: true });
  } catch {
    // swallow
  }
}
