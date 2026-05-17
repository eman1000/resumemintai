// lib/email/layout.ts
//
// Email HTML builders — mirrors the structure used in revance-leads
// (api/src/services/emailService.js). Pure string concatenation, no external
// templating engine — email clients are picky, plain HTML is most portable.
//
// Components: emailLayout (frame), emailP, emailCta, emailInfoBox,
// emailDivider, emailFootnote. Compose them with .join('') in a template.

// The logo lives in /public/logo/ — for emails we need an absolute URL.
// Set NEXT_PUBLIC_SITE_URL in env (already used elsewhere for sitemap, etc.).
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.resumemintai.com').replace(/\/$/, '');
const LOGO_LIGHT_URL = `${SITE_URL}/logo/resumemint-wordmark-light.svg`;
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT || `support@resumemintai.com`;

/** Top-level layout. `eyebrow` is the small uppercase tag above the heading;
 * `heading` is the big H1; `bodyContent` is whatever components you compose. */
export function emailLayout(eyebrow: string, heading: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeAttr(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F5F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F5F8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;">

  <!-- HEADER -->
  <tr>
    <td style="background-color:#0a2d50;padding:24px 32px;">
      <img src="${LOGO_LIGHT_URL}" alt="ResumeMint" width="180" height="40" style="display:block;border:0;outline:none;height:40px;width:auto;" />
    </td>
  </tr>

  <!-- ACCENT RULE (mint) -->
  <tr><td style="height:3px;background-color:#00b67a;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- BODY -->
  <tr>
    <td style="background-color:#FFFFFF;padding:36px 36px 28px;">
      <div style="font-size:10px;font-weight:600;letter-spacing:2.4px;text-transform:uppercase;color:#00b67a;margin-bottom:10px;">${escapeText(eyebrow)}</div>
      <h1 style="font-size:24px;font-weight:600;color:#1d1d20;line-height:1.25;margin:0 0 18px 0;">${heading}</h1>
      ${bodyContent}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background-color:#f8fafc;padding:18px 32px;border-top:1px solid #e5e7eb;">
      <p style="font-size:11px;color:#6b7280;line-height:1.6;margin:0;">
        &copy; ${new Date().getFullYear()} ResumeMint &middot;
        <a href="${SITE_URL}" style="color:#2a72d7;text-decoration:none;">resumemintai.com</a> &middot;
        Replies go to <a href="mailto:${SUPPORT_EMAIL}" style="color:#2a72d7;text-decoration:none;">${SUPPORT_EMAIL}</a>
      </p>
      <p style="font-size:11px;color:#9ca3af;line-height:1.6;margin:8px 0 0;">
        You received this because you're signed up at ResumeMint. <a href="${SITE_URL}/unsubscribe" style="color:#9ca3af;">Unsubscribe</a>.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function emailP(text: string): string {
  return `<p style="font-size:14px;color:#1f2937;line-height:1.65;margin:0 0 14px 0;">${text}</p>`;
}

export function emailCta(href: string, label: string, variant: 'brand' | 'mint' | 'dark' = 'brand'): string {
  const bg = variant === 'mint' ? '#00b67a' : variant === 'dark' ? '#0a2d50' : '#2a72d7';
  return `<table cellpadding="0" cellspacing="0" style="margin:6px 0 6px;"><tr><td style="border-radius:8px;background-color:${bg};">
    <a href="${escapeAttr(href)}" target="_blank" rel="noopener" style="display:inline-block;background-color:${bg};color:#ffffff;padding:12px 22px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">${escapeText(label)} &rarr;</a>
  </td></tr></table>`;
}

export function emailInfoBox(content: string): string {
  return `<div style="background-color:#eaf3fc;border-left:3px solid #2a72d7;border-radius:0 8px 8px 0;padding:12px 14px;margin:16px 0;font-size:13px;color:#1f2937;line-height:1.6;">${content}</div>`;
}

export function emailSuccessBox(content: string): string {
  return `<div style="background-color:#e9f9f1;border-left:3px solid #00b67a;border-radius:0 8px 8px 0;padding:12px 14px;margin:16px 0;font-size:13px;color:#15803d;line-height:1.6;">${content}</div>`;
}

export function emailAlertBox(content: string): string {
  return `<div style="background-color:#fef3c7;border-left:3px solid #d97706;border-radius:0 8px 8px 0;padding:12px 14px;margin:16px 0;font-size:13px;color:#92400e;line-height:1.6;">${content}</div>`;
}

export function emailDivider(): string {
  return `<div style="height:1px;background-color:#e5e7eb;margin:22px 0;"></div>`;
}

export function emailFootnote(text: string): string {
  return `<p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0;">${text}</p>`;
}

/** Job card block — used by the job-match email. Compact, scannable. */
export function emailJobCard(opts: {
  title: string;
  company?: string | null;
  location?: string | null;
  matchPct?: number | null;
  href: string;
}): string {
  const sub = [opts.company, opts.location].filter(Boolean).join(' · ');
  const pct = typeof opts.matchPct === 'number' && opts.matchPct > 0
    ? `<span style="display:inline-block;background:#e9f9f1;color:#047857;font-weight:600;font-size:11px;padding:3px 8px;border-radius:999px;margin-left:8px;">${opts.matchPct}% match</span>`
    : '';
  return `<a href="${escapeAttr(opts.href)}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:inherit;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin:0 0 10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <div style="font-size:15px;font-weight:600;color:#1d1d20;line-height:1.3;">${escapeText(opts.title)}</div>
    </div>
    <div style="font-size:12px;color:#52525a;line-height:1.5;margin-top:2px;">${escapeText(sub)}${pct}</div>
    <div style="font-size:12px;color:#2a72d7;margin-top:8px;font-weight:600;">Tailor and apply &rarr;</div>
  </a>`;
}

/* ---------------- helpers ---------------- */
function escapeText(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
