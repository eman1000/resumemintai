// lib/checkerHandoff.ts
//
// Tiny sessionStorage bridge between /resume-checker and the builder.
// The checker stashes the user's pasted/uploaded resume text plus the JD
// they were scoring against; /builder picks it up on mount, creates a new
// resume, and (separately) the editor surfaces the JD for tailoring.

export const CHECKER_HANDOFF_KEY = 'resumemint:checker-handoff';

export type CheckerHandoff = {
  resumeText: string;
  jdText: string;
  // Score the user saw on the checker, for follow-up analytics.
  score?: number;
  ts: number;
};

export function setCheckerHandoff(data: Omit<CheckerHandoff, 'ts'>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      CHECKER_HANDOFF_KEY,
      JSON.stringify({ ...data, ts: Date.now() }),
    );
  } catch {
    /* full storage etc. — non-fatal */
  }
}

export function consumeCheckerHandoff(): CheckerHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CHECKER_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CHECKER_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as CheckerHandoff;
    // Expire after 1 hour — stale data shouldn't ambush a later session.
    if (!parsed || Date.now() - (parsed.ts || 0) > 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function peekCheckerHandoff(): CheckerHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CHECKER_HANDOFF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckerHandoff;
  } catch {
    return null;
  }
}

/**
 * Per-resume JD stash. The editor reads this on mount so a freshly-created
 * resume from the checker handoff can offer "Tailor to this job" with the
 * JD already prefilled.
 */
export function setTailoredJdForResume(resumeId: string, jdText: string) {
  if (typeof window === 'undefined' || !jdText) return;
  try {
    sessionStorage.setItem(`resumemint:tailor-jd:${resumeId}`, jdText);
  } catch {}
}

export function consumeTailoredJdForResume(resumeId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `resumemint:tailor-jd:${resumeId}`;
    const v = sessionStorage.getItem(key);
    if (v) sessionStorage.removeItem(key);
    return v;
  } catch {
    return null;
  }
}
