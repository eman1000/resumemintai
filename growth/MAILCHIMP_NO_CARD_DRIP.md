# Mailchimp: "no card" follow-up journey

Goal: email accounts that signed up but never saved a card, until they start the trial.

## How the audience is kept in sync (code, already live)
- `lib/mailchimp.ts` — contact upsert + tags. No-op until `MAILCHIMP_API_KEY` and `MAILCHIMP_AUDIENCE_ID` are set in Vercel.
- Signup (`/api/account/ensure`, first login) → tag **no-card** + `candidate`/`recruiter`, merge field `SIGNUP` (YYYY-MM-DD), `COUNTRY`.
- Stripe `customer.subscription.*` webhook → active/trialing/past_due: tag **subscribed**, remove no-card. Canceled/unpaid/deleted: tag **churned**.
- `scripts/mailchimp-backfill.mjs` — loads existing accounts with the same tags plus `backfill`.
- Guest/placeholder accounts (`guest+…@noemail.resumemint`) are never synced: there is no real address.

## One-time Mailchimp setup (dashboard, cannot be done via API)
1. Audience → Settings → Audience fields: add text merge fields `SIGNUP` (tag `SIGNUP`) and `COUNTRY` (tag `COUNTRY`).
2. Website → Domains → **authenticate resumemintai.com** (adds DKIM + SPF CNAME/TXT records in the DNS host). Until this is done Mailchimp sends "via mailchimpapp.net" and inbox placement is poor.
3. Audience defaults: From name **ResumeMint**, from email **hello@resumemintai.com** (or support@), reply-to the same.
4. Customer Journey: trigger **Tag added: no-card**. Exit/goal: **Tag added: subscribed** (also exit on `churned`). Journey points below.

## Journey copy (from: ResumeMint <hello@resumemintai.com>)
Every claim below is true today. Do not add numbers (users, success rates) that we cannot back up.

### Email 1 — 1 hour after signup
Subject: Your resume is waiting
Preview: Finish it in a few minutes.

Hi,

You created a ResumeMint account but haven't started your 7-day free trial yet, so nothing has been saved to your plan.

Start the trial and you get every template, the AI rewrite, and the ATS keyword tailoring. You won't be charged during the trial, and you can cancel anytime from your account page.

[Start my free trial] → https://www.resumemintai.com/builder

ResumeMint

### Email 2 — day 2
Subject: Why your resume gets filtered out
Preview: Most rejections happen before a human reads it.

Hi,

Applicant tracking systems rank resumes by how closely they match the job posting. A strong resume with the wrong wording lands at the bottom.

ResumeMint reads the job description you paste, finds the keywords you're missing, and rewrites your bullets around them without inventing experience.

Run a free ATS check first if you want to see where you stand: https://www.resumemintai.com/resume-checker

Then start your 7-day free trial to fix it: https://www.resumemintai.com/builder

ResumeMint

### Email 3 — day 5
Subject: One more thing before you go
Preview: Trial is free for 7 days, cancel anytime.

Hi,

Last note from us. If you're still applying, ResumeMint is $19.99/month after a 7-day free trial, and you can cancel during the trial and pay nothing.

What you get: every resume and cover letter template, AI rewriting, job-specific tailoring, and a clean ATS-friendly PDF export.

[Start my free trial] → https://www.resumemintai.com/builder

If you've already found a job, reply and tell us. We'd love to hear it.

ResumeMint

## Checks after go-live
- Mailchimp → Audience → tag `no-card` count should match `real_no_sub` from the DB (32 on 2026-10-21).
- A test signup on production should appear in the audience within a minute with tag `no-card`.
- Starting a trial should flip the contact to `subscribed` within a minute (Stripe webhook).
