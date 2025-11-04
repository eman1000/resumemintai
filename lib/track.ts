// lib/track.ts
'use client';

import { getKeymanIdPreferUrl } from '@/lib/keyman';

type TrackOpts = {
  event: 'impression' | 'checkout_start' | 'sale' | string;
  props?: Record<string, any>;
  dedupeKey?: string | null;
  includeAuth?: boolean; // default true
};

export async function track({ event, props = {}, dedupeKey, includeAuth = true }: TrackOpts) {
  try {
    // Push to GTM (non-blocking)
    if (typeof window !== 'undefined') {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event, ...props });
    }

    // Prefer ?km=... from URL, fall back to persisted/generated id
    const keymanId = getKeymanIdPreferUrl();

    const body = {
      event,
      props: { ...props, keyman_id: keymanId ?? undefined },
      ts: Date.now(),
      dedupeKey: dedupeKey ?? null,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const idToken = (props as any)?._idToken as string | undefined;
    if (includeAuth && idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const json = JSON.stringify(body);

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const ok = navigator.sendBeacon('/api/track', new Blob([json], { type: 'application/json' }));
      if (ok) return;
    }

    await fetch('/api/track', { method: 'POST', headers, body: json, keepalive: true });
  } catch {
    // swallow
  }
}
