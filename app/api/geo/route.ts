// app/api/geo/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const h = headers();

  // Vercel-provided geo headers
  const country = h.get('x-vercel-ip-country') || null;           // e.g. "US"
  const region  = h.get('x-vercel-ip-country-region') || null;    // ISO 3166-2 (e.g. "CA")
  const city    = h.get('x-vercel-ip-city') || null;              // e.g. "San Francisco"
  const postal  = h.get('x-vercel-ip-postal-code') || null;       // e.g. "94103" (newer header)
  const lat     = h.get('x-vercel-ip-latitude') || null;
  const lon     = h.get('x-vercel-ip-longitude') || null;

  // Best-effort IP (may be empty in some envs)
  const ip =
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null;

  // Optional: allow mock in dev
  const url = new URL(req.url);
  const mockIp = url.searchParams.get('mock-ip');
  const mockCountry = url.searchParams.get('mock-country');
  const payload = {
    ip: mockIp ?? ip,
    country_code: mockCountry ?? country,
    region,
    city,
    postal,
    lat: lat ? Number(lat) : null,
    lon: lon ? Number(lon) : null,
    isp: null, // Not provided by Vercel Geo
    source: 'vercel-geo-headers',
  };

  return NextResponse.json(payload);
}
