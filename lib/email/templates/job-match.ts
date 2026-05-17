// lib/email/templates/job-match.ts
//
// "Jobs that match your resume" — the first concrete email template.
// Used by /api/jobs/match-for-resume's email side-effect after a resume save,
// and by any future digest cron. Composes layout.ts builders; no logic.

import {
  emailLayout,
  emailP,
  emailCta,
  emailJobCard,
  emailDivider,
  emailFootnote,
} from '../layout';
import { sendEmail } from '../mailgun';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.resumemintai.com').replace(/\/$/, '');

export type JobMatchEmailJob = {
  title: string;
  company?: string | null;
  location?: string | null;
  matchPct?: number | null;
  /** Deep link into /jobs that ideally pre-selects this job. */
  focusUrl: string;
};

type SendOpts = {
  to: string;
  firstName?: string | null;
  resumeTitle: string;
  jobs: JobMatchEmailJob[];
  /** When true, omit the unsubscribe footer (used for transactional, not digest). */
  transactional?: boolean;
};

export async function sendJobMatchEmail(opts: SendOpts) {
  if (!opts.jobs || opts.jobs.length === 0) {
    return { ok: false, skipped: true };
  }

  const top = opts.jobs[0];
  const headline = `${opts.jobs.length === 1 ? '1 job' : `${opts.jobs.length} jobs`} match your resume`;
  const greeting = opts.firstName ? `Hey ${opts.firstName},` : `Hey,`;

  const body = [
    emailP(greeting),
    emailP(
      `We just looked over <strong>${escapeHtml(opts.resumeTitle)}</strong> against fresh listings — here ${opts.jobs.length === 1 ? 'is the top role' : `are the top ${opts.jobs.length}`} we think you'd score well on.`,
    ),

    // Top-of-mind first
    emailP(`<strong>Top pick:</strong>`),
    emailJobCard({
      title: top.title,
      company: top.company,
      location: top.location,
      matchPct: top.matchPct,
      href: top.focusUrl,
    }),

    ...(opts.jobs.length > 1
      ? [
          emailP(`<strong>Other strong matches:</strong>`),
          ...opts.jobs.slice(1, 3).map((j) =>
            emailJobCard({
              title: j.title,
              company: j.company,
              location: j.location,
              matchPct: j.matchPct,
              href: j.focusUrl,
            }),
          ),
        ]
      : []),

    emailDivider(),
    emailP(
      `Click any role to land on the job page, generate a tailored resume + cover letter, and apply with your kit on the clipboard. No retyping.`,
    ),
    emailCta(`${SITE_URL}/jobs`, 'Browse all matches', 'brand'),
    emailDivider(),
    emailFootnote(
      `These picks are derived from your most-recent saved resume and the latest fetched listings. As you edit your resume, matches stay fresh.`,
    ),
  ].join('');

  return sendEmail({
    to: opts.to,
    subject: headline,
    html: emailLayout('Job matches', headline, body),
    tags: ['job-match', opts.transactional ? 'transactional' : 'digest'],
  });
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
