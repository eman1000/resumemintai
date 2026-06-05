// SINGLE SOURCE OF TRUTH for which button labels the agent may click.
// Imported by BOTH the extension executor (chrome-extension/src/content/
// executor.ts) and the server planner prompt (app/api/extension/agent/
// route.ts) so the two can never drift apart again (G9).
//
// Keep labels lowercase. `test()` does case-insensitive exact or prefix
// matching ("Next: Personal Information" matches the "next" prefix rule).

/** Exact labels (case-insensitive). */
export const ALLOWED_BUTTON_LABELS = [
  "next",
  "continue",
  "review",
  "apply",
  "easy apply",
  "submit",
  "submit application",
  "send",
  "send application",
  "i agree",
  "i accept",
  "save",
  "save and continue",
  "ok",
  "add",
  "upload resume",
  "attach resume",
  "sign in with google",
  "use google",
] as const;

/** Prefix labels — "next:" covers Workday's "Next: Personal Information". */
export const ALLOWED_BUTTON_PREFIXES = ["next:", "continue to", "save and"] as const;

export function isAllowedButtonLabel(label: string): boolean {
  const t = label.trim().toLowerCase();
  if (!t) return false;
  if ((ALLOWED_BUTTON_LABELS as readonly string[]).includes(t)) return true;
  return (ALLOWED_BUTTON_PREFIXES as readonly string[]).some((p) => t.startsWith(p));
}

/** Human-readable list for the LLM system prompt. */
export function allowedButtonsForPrompt(): string {
  return (
    (ALLOWED_BUTTON_LABELS as readonly string[])
      .map((l) => l.replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(", ") +
    "; plus any label starting with: " +
    (ALLOWED_BUTTON_PREFIXES as readonly string[]).join(", ")
  );
}
