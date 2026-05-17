import * as React from 'react';

type Variant = 'wordmark' | 'wordmark-light' | 'mark';
type Size = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  variant?: Variant;
  size?: Size;
  className?: string;
  withTagline?: boolean;
};

// Pixel heights for each size. Width is fluid for the wordmark.
const SIZE_HEIGHT: Record<Size, number> = {
  sm: 22,
  md: 28,
  lg: 38,
  xl: 56,
};

const BRAND = '#2a72d7';
const BRAND_DEEP = '#0a2d50';
const MINT = '#00b67a';
const MINT_LIGHT = '#34d399';

/**
 * MintLeaf — small geometric mint leaf used as the dot on the "i" in "Mint",
 * and as the accent on the monogram. Drawn at viewBox 0..40 so callers can
 * scale into any container.
 */
function MintLeaf({ size, color = MINT, color2 = MINT_LIGHT, idSuffix }: { size: number; color?: string; color2?: string; idSuffix: string }) {
  const gradId = `leaf-${idSuffix}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color2} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <g transform="translate(20 20) rotate(28) translate(-15 -15)">
        <path
          d="M0 20 C 0 7, 13 0, 26 0 C 26 13, 18 26, 5 26 C 2 26, 0 24, 0 20 Z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M3 21 Q 11 14, 23 3"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/**
 * Monogram mark — rounded square with white "RM" and a leaf accent.
 * Used as favicon, app icon, and mobile-narrow logo slot.
 */
function MarkMonogram({ size }: { size: number }) {
  const idSuffix = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      aria-label="ResumeMint"
      role="img"
    >
      <defs>
        <linearGradient id={`bg-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d8be0" />
          <stop offset="100%" stopColor={BRAND} />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="14" ry="14" fill={`url(#bg-${idSuffix})`} />
      <text
        x="28"
        y="38"
        textAnchor="middle"
        fill="white"
        fontFamily="var(--font-brand), 'Plus Jakarta Sans', system-ui, sans-serif"
        fontWeight="800"
        fontSize="26"
        letterSpacing="-1"
      >
        RM
      </text>
      {/* Top-right leaf accent */}
      <g transform="translate(40 6) scale(0.35)">
        <path
          d="M0 22 C 0 8, 14 0, 28 0 C 28 14, 20 28, 6 28 C 2.4 28, 0 25.6, 0 22 Z"
          fill={MINT}
        />
      </g>
    </svg>
  );
}

/**
 * Full Logo. Default variant = "wordmark" which renders the brand name with
 * Plus Jakarta Sans + a small mint leaf as the dot on the "i" in "Mint".
 */
export default function Logo({
  variant = 'wordmark',
  size = 'md',
  className,
  withTagline = false,
}: Props) {
  const h = SIZE_HEIGHT[size];

  if (variant === 'mark') {
    return (
      <span className={className} aria-label="ResumeMint" role="img">
        <MarkMonogram size={h} />
      </span>
    );
  }

  const isLight = variant === 'wordmark-light';
  const resumeColor = isLight ? '#ffffff' : BRAND_DEEP;
  const mintColor = MINT;
  // The "i" in "Mint" gets its dot replaced by a leaf. Render "Mint" as
  // "M i nt" parts so we can sandwich the leaf.

  return (
    <span
      className={`inline-flex items-baseline gap-0 font-brand font-extrabold tracking-tight ${className || ''}`}
      style={{ height: h, lineHeight: 1, fontSize: h * 0.78 }}
      aria-label="ResumeMint"
      role="img"
    >
      <span style={{ color: resumeColor }}>Resume</span>
      <span style={{ color: mintColor, display: 'inline-flex', alignItems: 'baseline' }}>
        <span>M</span>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          {/* lowercase i with the dot replaced by a mint leaf above */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: -h * 0.18,
              width: h * 0.32,
              height: h * 0.32,
            }}
          >
            <MintLeaf size={h * 0.32} idSuffix={`wm-${size}`} />
          </span>
          {/* render "ı" (dotless i) so the leaf is the only dot */}
          ı
        </span>
        <span>nt</span>
      </span>
      {withTagline && (
        <span
          className="ml-2 self-end pb-[0.15em] font-medium text-[0.45em] tracking-[0.18em] uppercase"
          style={{ color: isLight ? '#e5e7eb' : '#6b7280' }}
        >
          AI Resume Builder
        </span>
      )}
    </span>
  );
}
