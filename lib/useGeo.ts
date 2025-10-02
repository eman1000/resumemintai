// lib/useGeo.ts
'use client';

import { useEffect, useState } from 'react';

type Geo = {
  ip: string;
  country_code: string;
  country_name: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  isp: string;
};

export function useGeo(opts?: { mockIp?: string }) {
  const [data, setData] = useState<Geo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const url = new URL('/api/geo', window.location.origin);

    // Prefer explicit prop, else read from current page URL
    const fromProp = opts?.mockIp;
    const fromQuery = new URLSearchParams(window.location.search).get('mock-ip') || undefined;
    const mock = fromProp ?? fromQuery;
    if (mock) url.searchParams.set('mock-ip', mock);

    // Don’t cache geo calls
    fetch(url.toString(), { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((j) => { if (!cancelled) { setData(j); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e)); setLoading(false); } });

    return () => { cancelled = true; };
  }, [opts?.mockIp]);

  return { data, loading, error };
}
