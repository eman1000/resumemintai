// app/api/og/route.tsx
//
// Dynamic Open Graph image generator. Renders a 1200x630 PNG using Next.js's
// next/og ImageResponse so every page has a high-quality social-share card
// without us hand-shipping PNGs.
//
// Usage:
//   /api/og                          → default brand card
//   /api/og?title=Software+Engineer  → role-specific card (used by /resume/[role] etc.)
//   /api/og?title=...&subtitle=...   → with optional subtitle line
//   /api/og?eyebrow=Templates&title=Modern  → with uppercase eyebrow

import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const BRAND = '#2a72d7';
const BRAND_DEEP = '#0a2d50';
const MINT = '#00b67a';
const TEXT = '#1d1d20';
const MUTED = '#6b7280';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') || 'AI Resume Builder that beats ATS').slice(0, 120);
  const subtitle = (searchParams.get('subtitle') || 'Tailor your resume to any job with AI').slice(0, 160);
  const eyebrow = (searchParams.get('eyebrow') || 'RESUMEMINT').slice(0, 24).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px',
          background:
            'linear-gradient(135deg, #ffffff 0%, #eaf3fc 60%, #e9f9f1 100%)',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          color: TEXT,
        }}
      >
        {/* Top: logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Inline logo as an SVG via <svg> JSX so ImageResponse renders it */}
          <svg width="80" height="80" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
            <rect width="256" height="256" rx="56" ry="56" fill={BRAND} />
            <text
              x="128"
              y="172"
              textAnchor="middle"
              fill="#ffffff"
              fontFamily="system-ui, sans-serif"
              fontWeight="700"
              fontSize="138"
              letterSpacing="-6"
            >
              RM
            </text>
            <g transform="translate(186 38) rotate(28)">
              <path
                d="M0 22 C 0 8, 14 0, 28 0 C 28 14, 20 28, 6 28 C 2.4 28, 0 25.6, 0 22 Z"
                fill={MINT}
              />
            </g>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '38px',
                fontWeight: 700,
                letterSpacing: '-1.5px',
                color: BRAND_DEEP,
                display: 'flex',
              }}
            >
              Resume<span style={{ color: MINT }}>mint</span>
            </div>
            <div style={{ fontSize: '15px', color: MUTED, marginTop: '2px' }}>
              resumemintai.com
            </div>
          </div>
        </div>

        {/* Middle: headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              fontSize: '17px',
              letterSpacing: '4px',
              fontWeight: 700,
              color: MINT,
              display: 'flex',
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: '70px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-2.5px',
              color: BRAND_DEEP,
              maxWidth: '1000px',
              display: 'flex',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 400,
              lineHeight: 1.35,
              color: MUTED,
              maxWidth: '900px',
              display: 'flex',
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Bottom rule + tags */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            paddingTop: '20px',
            borderTop: '3px solid ' + MINT,
            color: MUTED,
            fontSize: '20px',
          }}
        >
          <span>AI-tailored resumes</span>
          <span>·</span>
          <span>Cover letters</span>
          <span>·</span>
          <span>One-click apply</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
