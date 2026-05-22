// Executes an AgentAction against the live DOM. Side panel sends an
// AGENT_EXECUTE message; this resolves it and reports back success/failure.

import type { AgentAction } from "../types";

type ExecResult = { ok: boolean; note?: string };

/** Wait until the DOM has stopped mutating for `quietMs`, or `maxMs` elapses.
 * Used after clicks so SPAs (LinkedIn, Workday) get a chance to render the
 * next form step before we re-snapshot. */
function waitForSettled(quietMs = 600, maxMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const obs = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(done, quietMs);
    });
    const done = () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
      resolve();
    };
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    timer = setTimeout(done, quietMs);
    setTimeout(done, maxMs);
  });
}

const FIELD_SELECTOR = [
  "input:not([type=hidden]):not([type=password]):not([type=submit]):not([type=button])",
  "select",
  "textarea",
].join(",");

/** Find a field by the id our snapshot helper emits. */
function findField(id: string): HTMLElement | null {
  // Direct id
  if (id && !id.includes(":")) {
    const direct = document.getElementById(id);
    if (direct) return direct;
  }
  if (id.startsWith("name:")) {
    const name = id.slice("name:".length);
    return document.querySelector<HTMLElement>(`[name="${cssEscape(name)}"]`);
  }
  if (id.startsWith("aria:")) {
    const aria = id.slice("aria:".length);
    const all = Array.from(document.querySelectorAll<HTMLElement>(FIELD_SELECTOR));
    return (
      all.find(
        (el) =>
          el.getAttribute("aria-label")?.trim().slice(0, 60) === aria.slice(0, 60),
      ) || null
    );
  }
  if (id.startsWith("pos:")) {
    const idx = Number(id.slice("pos:".length));
    const all = Array.from(document.querySelectorAll<HTMLElement>(FIELD_SELECTOR));
    return all[idx] || null;
  }
  return null;
}

function cssEscape(s: string): string {
  return s.replace(/(["\\])/g, "\\$1");
}

/** Set a value and fire React-friendly events so frameworks notice. */
function setValue(el: HTMLElement, value: string): void {
  const tag = el.tagName.toLowerCase();
  if (tag === "select") {
    const sel = el as HTMLSelectElement;
    const target = Array.from(sel.options).find(
      (o) =>
        o.text.trim().toLowerCase() === value.trim().toLowerCase() ||
        o.value.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (target) {
      sel.value = target.value;
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return;
  }
  if (tag === "textarea" || tag === "input") {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    const proto =
      tag === "textarea"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/** Find a button by id, exact text, or "text:..." pseudo-id from our snapshot. */
function findButton(idOrText: string): HTMLElement | null {
  if (!idOrText) return null;
  if (idOrText.startsWith("text:")) {
    const t = idOrText.slice("text:".length).trim().toLowerCase();
    const all = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, input[type=submit], a[role=button]",
      ),
    );
    return (
      all.find((b) => {
        const txt = (b.textContent || (b as HTMLInputElement).value || "")
          .trim()
          .toLowerCase();
        return txt === t || txt.startsWith(t);
      }) || null
    );
  }
  return (
    document.getElementById(idOrText) ||
    (document.querySelector(`[data-id="${cssEscape(idOrText)}"]`) as HTMLElement | null)
  );
}

/** Click the page's "Sign in with Google" button if we can find one. */
export function clickGoogleSignIn(): boolean {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>("button, a, [role=button]"),
  );
  const btn = all.find((b) => {
    const t = (b.textContent || "").toLowerCase();
    return /sign in with google|continue with google|google/.test(t);
  });
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}

export async function executeAction(action: AgentAction): Promise<ExecResult> {
  switch (action.type) {
    case "fill": {
      let filled = 0;
      let missing = 0;
      for (const [id, value] of Object.entries(action.fields || {})) {
        const el = findField(id);
        if (!el) {
          missing++;
          continue;
        }
        setValue(el, String(value ?? ""));
        filled++;
      }
      // Short settle — some forms run validation/format on each input.
      await waitForSettled(250, 1500);
      return {
        ok: filled > 0,
        note: `filled ${filled} field${filled === 1 ? "" : "s"}${missing ? `, ${missing} missing` : ""}`,
      };
    }
    case "click": {
      // Guardrail: only allow clicks on forward-progression buttons. The LLM
      // sometimes wanders to job listings or random links — we refuse.
      const allowed = /^(next|continue|review|apply|easy apply|submit( application)?|send|i agree|i accept|sign in with google|use google|save)$/i;
      const selectorText = action.selector.startsWith("text:")
        ? action.selector.slice("text:".length).trim()
        : "";
      if (selectorText && !allowed.test(selectorText)) {
        return { ok: false, note: `refused click on "${selectorText}" (not a recognised form-progression button)` };
      }
      const btn = findButton(action.selector);
      if (!btn) return { ok: false, note: `button not found: ${action.selector}` };
      btn.click();
      await waitForSettled();
      return { ok: true, note: `clicked ${action.selector}` };
    }
    case "use_google_signin": {
      const ok = clickGoogleSignIn();
      if (!ok) return { ok: false, note: "no Google sign-in button found" };
      await waitForSettled();
      return { ok: true, note: "clicked Sign in with Google" };
    }
    case "submit": {
      // Find a likely submit button — prefer type=submit, then text match.
      const candidate =
        document.querySelector<HTMLElement>("button[type=submit], input[type=submit]") ||
        Array.from(
          document.querySelectorAll<HTMLElement>("button, a[role=button]"),
        ).find((b) =>
          /^(submit|apply|send( application)?|submit application)$/i.test(
            (b.textContent || "").trim(),
          ),
        );
      if (!candidate) return { ok: false, note: "no submit button found" };
      candidate.click();
      await waitForSettled();
      return { ok: true, note: "clicked submit" };
    }
    // These don't touch the page — side panel handles them. We just acknowledge.
    case "ask_user":
    case "needs_login":
    case "select_resume":
    case "tailor":
    case "done":
      return { ok: true, note: "side-panel action" };
  }
}
