// lib/track.ts
'use client';

import { getKeymanIdPreferUrl } from '@/lib/keyman';

type TrackOpts = {
  event: 'impression' | 'checkout_start' | 'sale' | string;
  props?: Record<string, any>;
  dedupeKey?: string | null;
  includeAuth?: boolean; // default true
};

// --- GA4 conversion helpers ----------------------------------------------
// These are session-deduped (per browser tab, per event/dedupeKey) so we
// don't double-count a conversion if a user retries a flow or a component
// re-mounts. The dedupeKey is sent to /api/track too — server-side dedupe
// guards against retried POSTs.
function alreadyFired(dedupeKey: string): boolean {
  if (typeof window === 'undefined') return false;
  const KEY = '__rm_tracked';
  const set: Set<string> = (window as any)[KEY] || new Set();
  if (set.has(dedupeKey)) return true;
  set.add(dedupeKey);
  (window as any)[KEY] = set;
  return false;
}

/**
 * Fired when a Stripe subscription is created. Also fires `trial_start`
 * if the subscription's initial status is `trialing`.
 *
 * GA4 maps `value` + `currency` to monetary conversions in Reports.
 */
export function trackSubscribeSuccess(args: {
  subscriptionId: string;
  status?: string | null;     // 'active' | 'trialing' | 'incomplete' | …
  priceAmount?: number | null; // minor units (cents)
  priceCurrency?: string | null;
  page?: string;
}) {
  const isTrial = (args.status || '').toLowerCase() === 'trialing';
  const value = typeof args.priceAmount === 'number' ? args.priceAmount / 100 : undefined;
  const currency = args.priceCurrency ? args.priceCurrency.toUpperCase() : undefined;

  if (!alreadyFired(`subscribe:${args.subscriptionId}`)) {
    track({
      event: 'subscribe',
      props: {
        subscription_id: args.subscriptionId,
        status: args.status ?? null,
        value,
        currency,
        page: args.page,
      },
      dedupeKey: `subscribe:${args.subscriptionId}`,
    });
  }

  if (isTrial && !alreadyFired(`trial_start:${args.subscriptionId}`)) {
    track({
      event: 'trial_start',
      props: {
        subscription_id: args.subscriptionId,
        value,
        currency,
        page: args.page,
      },
      dedupeKey: `trial_start:${args.subscriptionId}`,
    });
  }
}

/**
 * Fired every time the user successfully exports a resume to PDF.
 * Not deduped — every export is a separate conversion event.
 */
export function trackResumeExported(args: {
  resumeId?: string | null;
  renderer?: string | null;
  page?: string;
}) {
  track({
    event: 'resume_exported',
    props: {
      resume_id: args.resumeId ?? null,
      renderer: args.renderer ?? null,
      page: args.page,
    },
  });
}

export async function track({ event, props = {}, dedupeKey, includeAuth = true }: TrackOpts) {
  try {
    if (typeof window !== 'undefined') {
      // 1. Push to dataLayer in GTM-container format (no-op today since no GTM
      //    container is loaded, but future-proof if one is added later).
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event, ...props });

      // 2. Send the event to GA4 + Google Ads via gtag directly. This is the
      //    path that actually works: gtag.js is loaded in layout.tsx but only
      //    understands gtag('event', ...) calls, NOT raw dataLayer object
      //    pushes. Without this, conversion events (subscribe/trial_start/
      //    resume_exported) never reach GA4 or Google Ads, so Ads cannot
      //    optimize toward them. value/currency in props map to GA4 monetary
      //    conversions automatically.
      const gtag = (window as any).gtag;
      if (typeof gtag === 'function') {
        gtag('event', event, { ...props });
      }
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
