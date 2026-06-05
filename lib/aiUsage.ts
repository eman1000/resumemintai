// lib/aiUsage.ts
//
// Per-user rate limits for AI-spending routes. The premium routes call
// `checkAiUsage()` BEFORE the OpenAI call so we fail fast on a 429 instead of
// burning tokens, then `recordAiUsage()` AFTER a successful response.
//
// Why a dedicated table (`public.ai_usage`) instead of reusing `events`?
//   - We need fast COUNT() queries with rolling windows; a feature-indexed
//     table is meaningfully cheaper.
//   - We don't want analytics retention to dictate enforcement retention.
//
// Limits are intentionally per-feature so we can cap heavyweight calls
// (tailor-kit ≈ a $0.02 GPT-4o call) more aggressively than light ones.

import prisma from '@/lib/prisma';

export type AiFeature =
  | 'tailor-kit'
  | 'cover-letter-tailor'
  | 'ats-optimize'
  | 'section-suggest'
  | 'extension-fill'
  | 'extension-agent'
  | 'extension-resume-pdf';

type Limit = { day: number; month: number };

/** Defaults — change here if you need to relax or tighten. */
const LIMITS: Record<AiFeature, Limit> = {
  // The heaviest paid feature: full resume + cover letter generation with
  // gpt-4o. ~$0.02 per call. 20/day, 200/month keeps a paying user under $4/mo
  // even if they hit the cap every single day.
  'tailor-kit':          { day: 20, month: 200 },
  // Letter-only is cheaper but still gpt-4o. Higher cap since users tweak.
  'cover-letter-tailor': { day: 30, month: 300 },
  // Resume optimize: also gpt-4o.
  'ats-optimize':        { day: 30, month: 300 },
  // Light suggestions (gpt-4o-mini). Generous.
  'section-suggest':     { day: 50, month: 500 },
  // Chrome extension: single-field map calls (gpt-4o-mini). Very cheap.
  'extension-fill':      { day: 200, month: 2000 },
  // Chrome extension: agent loop turns (gpt-4o-mini, multi-turn).
  // Each application is typically 3–8 turns, so cap at ~30 applications/day.
  'extension-agent':     { day: 250, month: 3000 },
  // Chrome extension: Puppeteer PDF render for upload_resume. Heavyweight
  // (full headless-Chrome render) — one per application is the normal rate.
  'extension-resume-pdf': { day: 40, month: 400 },
};

export function getAiLimit(feature: AiFeature): Limit {
  return LIMITS[feature];
}

function startOfDayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function startOfMonthUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(1);
  return d;
}
function nextDayResetUtc(): Date {
  const d = startOfDayUtc();
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
function nextMonthResetUtc(): Date {
  const d = startOfMonthUtc();
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

export type UsageOk = {
  ok: true;
  feature: AiFeature;
  usedDay: number;
  usedMonth: number;
  remainingDay: number;
  remainingMonth: number;
  dayLimit: number;
  monthLimit: number;
};

export type UsageBlocked = {
  ok: false;
  feature: AiFeature;
  reason: 'daily_limit' | 'monthly_limit';
  limit: number;
  used: number;
  /** ISO timestamp when the window resets. */
  resetAt: string;
};

/** Check (does NOT record) whether the user is allowed to perform this AI
 * action right now. */
export async function checkAiUsage(
  userId: string,
  feature: AiFeature,
): Promise<UsageOk | UsageBlocked> {
  const limit = LIMITS[feature];
  const dayStart = startOfDayUtc();
  const monthStart = startOfMonthUtc();

  const [usedDay, usedMonth] = await Promise.all([
    prisma.aiUsage.count({
      where: { userId, feature, createdAt: { gte: dayStart } },
    }),
    prisma.aiUsage.count({
      where: { userId, feature, createdAt: { gte: monthStart } },
    }),
  ]);

  if (usedDay >= limit.day) {
    return {
      ok: false,
      feature,
      reason: 'daily_limit',
      limit: limit.day,
      used: usedDay,
      resetAt: nextDayResetUtc().toISOString(),
    };
  }
  if (usedMonth >= limit.month) {
    return {
      ok: false,
      feature,
      reason: 'monthly_limit',
      limit: limit.month,
      used: usedMonth,
      resetAt: nextMonthResetUtc().toISOString(),
    };
  }
  return {
    ok: true,
    feature,
    usedDay,
    usedMonth,
    remainingDay: Math.max(0, limit.day - usedDay),
    remainingMonth: Math.max(0, limit.month - usedMonth),
    dayLimit: limit.day,
    monthLimit: limit.month,
  };
}

/** Record one usage. Call AFTER a successful LLM response so failed calls
 * don't count against the user. */
export async function recordAiUsage(userId: string, feature: AiFeature): Promise<void> {
  try {
    await prisma.aiUsage.create({ data: { userId, feature } });
  } catch (e) {
    // Non-fatal — better to log and move on than to fail an otherwise-
    // successful request because the metering write hiccupped.
    console.warn('[aiUsage] record failed:', (e as any)?.message || e);
  }
}

/** Convenience: build the 429 response body shape we return to the client. */
export function quotaBlockedResponse(blocked: UsageBlocked) {
  return {
    error: 'quota_exceeded',
    reason: blocked.reason,
    feature: blocked.feature,
    limit: blocked.limit,
    used: blocked.used,
    resetAt: blocked.resetAt,
    detail:
      blocked.reason === 'daily_limit'
        ? `Daily limit reached (${blocked.limit}/day). Resets at ${new Date(blocked.resetAt).toLocaleString()}.`
        : `Monthly limit reached (${blocked.limit}/month). Resets ${new Date(blocked.resetAt).toLocaleDateString()}.`,
  };
}
