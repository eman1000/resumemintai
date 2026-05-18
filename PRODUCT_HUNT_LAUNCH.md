# ResumeMint — Product Hunt Launch Kit

> Owner: Growth · Status: **Prep** · Target launch: **Wednesday, 10 June 2026**

Product Hunt is a one-shot, free distribution channel. You get one good launch.
This doc holds the schedule, the asset checklist, and paste-ready copy so launch
day is execution, not writing.

---

## 1. Why this date

- **Today:** 18 May 2026. Launch is ~Week 4 of the growth plan.
- **Target: Wednesday, 10 June 2026.** Tue–Thu launches outperform Mon/Fri.
  Mid-week avoids the Monday backlog and Friday drop-off.
- PH days run **12:01 AM Pacific → 11:59 PM Pacific**. Post within the first
  few minutes of 12:01 AM PT to maximise time-on-leaderboard.
- **Backup date:** Tuesday, 9 June 2026 (if anything slips, do not push to Friday).

> PH does not let you truly "schedule" a post in advance on a free account —
> you create it as a **draft**, then publish (or use "Schedule" if available on
> your account) so it goes live at 12:01 AM PT. Decide the day-of operator now.

---

## 2. Timeline

### T-3 weeks (week of 18 May) — foundations
- [ ] Confirm launch-day operator and their timezone (someone awake near 12:01 AM PT / 9:01 AM CET).
- [ ] Create/clean the ResumeMint PH product page as a **draft**.
- [ ] Decide hunter: self-hunt is fine in 2026 — only chase a big hunter if they genuinely use the product.
- [ ] Make a PH **Ship / "coming soon"** page to collect pre-launch followers.
- [ ] Verify analytics: `trial_start`, `subscribe`, `resume_exported`, and `ats_check_*` events fire (already wired — confirm in GA4 DebugView).
- [ ] Add a `?ref=producthunt` UTM to every link used on PH so traffic is attributable in GA4.

### T-2 weeks
- [ ] Produce all assets in Section 4.
- [ ] Write/confirm all copy in Section 5 (already drafted below — review & adjust).
- [ ] Line up **15–25 supporters** who will genuinely engage on launch day (not vote rings — PH detects and penalises that). A comment > an upvote.
- [ ] Prepare the **launch-day discount**: e.g. annual plan at €5.99/mo for the first 100 sign-ups (code `PH2026`). Set up the Stripe coupon.
- [ ] Draft outreach DMs/emails to the supporter list (do not send yet).

### T-1 week
- [ ] Dry-run the product page on mobile and desktop.
- [ ] Test the `PH2026` coupon end-to-end in Stripe test mode.
- [ ] Confirm the site can handle a traffic spike (Vercel — fine; warm the DB connection).
- [ ] Schedule social posts (X, LinkedIn) for launch morning.
- [ ] Send supporters a heads-up: "We launch Wed 10 June — I'll send the link at 9 AM CET. A comment with your honest take helps most."

### T-1 day
- [ ] Final proofread of PH listing.
- [ ] Pin the **first comment** draft (Section 5) ready to paste.
- [ ] Get a good night's sleep — launch day is long.

### Launch day — Wed 10 June 2026 (times in CET; 12:01 AM PT = 9:01 AM CET)
- [ ] **09:01** — Publish. Paste the first comment immediately.
- [ ] **09:15** — Post to X and LinkedIn with the PH link. Personal accounts > brand account.
- [ ] **09:30** — Message supporters the live link (staggered, not all at once).
- [ ] **All day** — Reply to **every** comment within ~15 min. Engagement drives ranking.
- [ ] **Midday** — Post in relevant communities where self-promo is allowed (r/SideProject, Indie Hackers, relevant Slack/Discord groups). Not r/resumes — that bans promo.
- [ ] **Evening (US morning)** — Second push to US-based supporters as America wakes up.
- [ ] **23:59 PT** — Note final rank and vote/comment count.

### T+1 to T+7 — post-launch
- [ ] Thank every commenter; DM anyone who gave product feedback.
- [ ] Add a "As seen on Product Hunt" badge to the site **only if** you placed top 5.
- [ ] Log launch metrics in Section 6.
- [ ] Convert any real launch-day praise into **genuine, attributed testimonials** (with permission) — these can finally replace the empty `/reviews` page honestly.
- [ ] Email everyone who started a trial during launch with an onboarding nudge.

---

## 3. Hunter & first-comment strategy

- **Self-hunt** is the default. It is fully accepted in 2026 and keeps you in control.
- Only use an external hunter if they actually use resume tools and have an engaged
  audience — a big-name hunter with an irrelevant audience does little.
- The **maker's first comment is the most important text of the launch.** It must
  post within seconds of going live. Draft is in Section 5.

---

## 4. Asset checklist

| Asset | Spec | Notes |
|---|---|---|
| Thumbnail / logo | 240×240 px, PNG | Clean ResumeMint icon, no text |
| Gallery image 1 | 1270×760 px | Hero: the value prop in one line + product shot |
| Gallery image 2 | 1270×760 px | The ATS checker — score + missing keywords |
| Gallery image 3 | 1270×760 px | Resume tailored to a job description (before/after) |
| Gallery image 4 | 1270×760 px | Template gallery (the 12 templates) |
| Demo GIF/video | <3 MB GIF or short MP4 | 15–25s: paste resume + JD → tailored, ATS-ready resume |
| Social share image | 1200×630 px | For the X/LinkedIn posts |

Design notes: first gallery image must communicate the product in **2 seconds** —
most people never click past it. Use the brand emerald. Show real UI, not mockups.

---

## 5. Paste-ready copy

### Name
`ResumeMint`

### Tagline (≤ 60 characters)
`AI resume builder that tailors to any job and beats ATS`

### Topics / categories
`Productivity` · `Career` · `Artificial Intelligence` · `Hiring`

### Description (short, ≤ 260 chars)
> ResumeMint tailors your resume to any job description with AI, keeps the
> formatting ATS-friendly, and writes matching cover letters. Includes a free
> ATS checker — paste a resume + job post, get an instant score. 14-day free trial.

### Maker's first comment (post immediately on launch)
> Hey Product Hunt 👋
>
> I built ResumeMint after watching good candidates get auto-rejected — not
> because they were unqualified, but because their resume didn't match the job
> description the ATS was scanning for.
>
> ResumeMint fixes that:
> • **Tailor to any job** — paste a job description, the AI rewrites your resume
>   to match it (truthfully — it works from your real experience).
> • **Beat the ATS** — clean, parseable formatting + keyword coverage scoring.
> • **Free ATS checker** — try it with no signup: paste a resume + a job post,
>   get an instant score and the keywords you're missing → resumemintai.com/resume-checker
> • **Cover letters + 12 templates** — matched to each application.
>
> 🎁 Launch offer for Hunters: annual plan at **€5.99/mo** for the first 100
> sign-ups — use code **PH2026**. 14-day free trial, no card needed to start.
>
> I'd genuinely love your feedback — especially on the tailoring quality. What
> would make this a daily-use tool for your job search? I'm here all day.

### X / Twitter post
> We just launched ResumeMint on @ProductHunt 🚀
>
> Paste a job description → AI tailors your resume to match it → it actually
> passes the ATS.
>
> Free ATS checker, no signup needed. Would love your support & feedback 👇
> [PH link]

### LinkedIn post
> Most resumes never reach a human. They're filtered by an ATS for not matching
> the job description's keywords.
>
> Today we launched ResumeMint on Product Hunt — it tailors your resume to any
> job with AI, keeps it ATS-friendly, and includes a free ATS checker you can
> try with no signup.
>
> If you're job-hunting (or know someone who is), I'd love your feedback:
> [PH link]

### Gallery image captions
1. `Tailor your resume to any job — and actually pass the ATS.`
2. `Free ATS checker: paste a resume + job post, get an instant score.`
3. `AI rewrites your bullets to match the job description — from your real experience.`
4. `12 professional, ATS-friendly templates. One-click PDF export.`

---

## 6. KPIs — fill in on launch day

| Metric | Target | Actual |
|---|---|---|
| PH rank (end of day) | Top 5 | |
| Upvotes | 250+ | |
| Comments | 40+ | |
| Referral sessions (`?ref=producthunt`) | 800+ | |
| Trial starts from PH | 60+ | |
| `PH2026` redemptions | 25+ | |
| New paid subscribers (T+7) | 15+ | |

Track referral traffic in GA4 by the `?ref=producthunt` UTM. Product Hunt is a
**spike**, not a channel — the real win is the subscribers, backlinks, and
genuine testimonials it leaves behind.

---

## 7. Hard rules

- **No vote manipulation.** No "upvote me" asks, no vote-trade groups. PH detects
  it and will discount or remove the post.
- Ask supporters for **honest comments**, not upvotes — comments rank you higher
  and are allowed.
- Do **not** post the PH link in r/resumes or r/jobs — both ban self-promo and it
  will get the account banned. Use r/SideProject, Indie Hackers, and your own
  network instead.
- Every claim on the listing must be true. After the "10,000 users" cleanup,
  do not reintroduce inflated numbers anywhere.
