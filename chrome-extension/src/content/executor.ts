// Executes an AgentAction against the live DOM. Side panel sends an
// AGENT_EXECUTE message; this resolves it and reports back success/failure.
//
// v0.4/0.5: upload_resume (DataTransfer file attach), set_checkbox,
// select_option (native + custom comboboxes), scroll, gated click_at /
// type_text / press_key escape hatch, verify-after-act on fills, shadow-DOM
// aware lookups, stable data-rm-id ids, shared click allowlist.

import type { AgentAction } from "../types";
import { deepQueryAll, findByRmId, scrollIntoViewCenter } from "./dom";
import { isAllowedButtonLabel } from "../shared/allowedButtons";

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
  "[role='combobox']",
  "[role='textbox']",
  "[role='listbox']",
  "[role='radiogroup']",
  "[role='checkbox']",
  "[contenteditable='true']",
].join(",");

/** Find a field by the id our snapshot helper emits (id / name: / rm: /
 * legacy aria: & pos:). Shadow-DOM aware. */
function findField(id: string): HTMLElement | null {
  if (!id) return null;
  // Direct id
  if (!id.includes(":")) {
    const direct = document.getElementById(id);
    if (direct) return direct;
    // ids inside shadow roots
    const deep = deepQueryAll<HTMLElement>(`#${cssEscapeId(id)}`);
    if (deep[0]) return deep[0];
  }
  if (id.startsWith("rm:")) {
    return findByRmId(id.slice("rm:".length));
  }
  if (id.startsWith("name:")) {
    const name = id.slice("name:".length);
    const els = deepQueryAll<HTMLElement>(`[name="${cssEscape(name)}"]`);
    return els[0] || null;
  }
  if (id.startsWith("aria:")) {
    const aria = id.slice("aria:".length);
    const all = deepQueryAll<HTMLElement>(FIELD_SELECTOR);
    return (
      all.find(
        (el) =>
          el.getAttribute("aria-label")?.trim().slice(0, 60) === aria.slice(0, 60),
      ) || null
    );
  }
  if (id.startsWith("pos:")) {
    const idx = Number(id.slice("pos:".length));
    const all = deepQueryAll<HTMLElement>(FIELD_SELECTOR);
    return all[idx] || null;
  }
  return null;
}

function cssEscape(s: string): string {
  return s.replace(/(["\\])/g, "\\$1");
}

function cssEscapeId(s: string): string {
  // CSS.escape for id selectors; fall back to manual escaping.
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/([^\w-])/g, "\\$1");
}

/** Read back a field's current value (verify-after-act, G3). */
function readValue(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return ((el as any).value || "").trim();
  }
  if (el.getAttribute("contenteditable") === "true") {
    return (el.textContent || "").trim();
  }
  return (el.textContent || "").trim();
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
    return;
  }
  if (el.getAttribute("contenteditable") === "true") {
    el.focus();
    el.textContent = value;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }
}

/** Find a button by id, exact text, or "text:..." pseudo-id from our snapshot. */
function findButton(idOrText: string): HTMLElement | null {
  if (!idOrText) return null;
  if (idOrText.startsWith("text:")) {
    const t = idOrText.slice("text:".length).trim().toLowerCase();
    const all = deepQueryAll<HTMLElement>(
      "button, input[type=submit], a[role=button], [role=button]",
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
  const all = deepQueryAll<HTMLElement>("button, a, [role=button]");
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

/** Attach a PDF to an <input type=file> via DataTransfer. The side panel
 * fetched the rendered resume PDF and passed it as base64. Works on hidden
 * inputs too (ATSes hide the native input behind a styled button). */
function attachFile(
  el: HTMLInputElement,
  base64: string,
  filename: string,
): ExecResult {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const file = new File([bytes], filename, { type: "application/pdf" });
    const dt = new DataTransfer();
    dt.items.add(file);
    el.files = dt.files;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    const attached = el.files?.[0]?.name === filename;
    return attached
      ? { ok: true, note: `attached ${filename}` }
      : { ok: false, note: "file did not stick on the input" };
  } catch (e: any) {
    return { ok: false, note: `attach failed: ${e?.message || e}` };
  }
}

/** Drive a CUSTOM (non-native) dropdown: open it, find the matching
 * [role=option], click it. Returns ok=false so the planner can fall back to
 * click_at when the widget resists. */
async function selectCustomOption(el: HTMLElement, value: string): Promise<ExecResult> {
  const want = value.trim().toLowerCase();
  el.focus();
  el.click();
  await waitForSettled(200, 1200);
  // Options may portal to document.body — search the whole tree.
  const options = deepQueryAll<HTMLElement>("[role='option'], li[role='option']");
  const target =
    options.find((o) => (o.textContent || "").trim().toLowerCase() === want) ||
    options.find((o) => (o.textContent || "").trim().toLowerCase().startsWith(want)) ||
    options.find((o) => (o.textContent || "").trim().toLowerCase().includes(want));
  if (!target) {
    // Try type-to-filter: many comboboxes filter options as you type.
    const input = el.tagName === "INPUT" ? (el as HTMLInputElement) : el.querySelector("input");
    if (input) {
      setValue(input as HTMLElement, value);
      await waitForSettled(250, 1200);
      const after = deepQueryAll<HTMLElement>("[role='option'], li[role='option']");
      const t2 =
        after.find((o) => (o.textContent || "").trim().toLowerCase() === want) ||
        after.find((o) => (o.textContent || "").trim().toLowerCase().includes(want));
      if (t2) {
        t2.click();
        await waitForSettled(200, 1000);
        return { ok: true, note: `selected "${value}" (type-to-filter)` };
      }
    }
    // Close whatever we opened so we don't leave the page in a weird state.
    document.body.click();
    return { ok: false, note: `option "${value}" not found in custom dropdown` };
  }
  target.click();
  await waitForSettled(200, 1000);
  return { ok: true, note: `selected "${value}"` };
}

/** Pick a radio option inside a radiogroup (or by shared input name). */
function selectRadioOption(el: HTMLElement, value: string): ExecResult {
  const want = value.trim().toLowerCase();
  const radios = deepQueryAll<HTMLElement>("[role='radio'], input[type=radio]", el);
  const target = radios.find((r) => {
    const label = (
      r.getAttribute("aria-label") ||
      r.closest("label")?.textContent ||
      r.textContent ||
      (r as HTMLInputElement).value ||
      ""
    )
      .trim()
      .toLowerCase();
    return label === want || label.startsWith(want) || label.includes(want);
  });
  if (!target) return { ok: false, note: `radio option "${value}" not found` };
  target.click();
  if (target instanceof HTMLInputElement) {
    target.checked = true;
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return { ok: true, note: `picked "${value}"` };
}

export async function executeAction(
  action: AgentAction,
  // upload_resume payload injected by the content-script message handler.
  filePayload?: { base64: string; filename: string },
): Promise<ExecResult> {
  switch (action.type) {
    case "fill": {
      let filled = 0;
      let missing = 0;
      const failures: string[] = [];
      for (const [id, value] of Object.entries(action.fields || {})) {
        const el = findField(id);
        if (!el) {
          missing++;
          continue;
        }
        scrollIntoViewCenter(el);
        setValue(el, String(value ?? ""));
        // VERIFY-AFTER-ACT (G3): confirm the value actually stuck. React
        // controlled inputs and masked fields sometimes reject programmatic
        // sets; report per-field so the planner can retry another way.
        const got = readValue(el);
        if (got === String(value ?? "").trim() || (got && got.length > 0)) {
          filled++;
        } else {
          failures.push(id);
        }
      }
      // Short settle — some forms run validation/format on each input.
      await waitForSettled(250, 1500);
      const failNote = failures.length ? `, ${failures.length} did not stick (${failures.slice(0, 3).join(", ")})` : "";
      return {
        ok: filled > 0,
        note: `filled ${filled} field${filled === 1 ? "" : "s"}${missing ? `, ${missing} missing` : ""}${failNote}`,
      };
    }
    case "set_checkbox": {
      const el = findField(action.fieldId);
      if (!el) return { ok: false, note: `checkbox not found: ${action.fieldId}` };
      scrollIntoViewCenter(el);
      const isNative = el instanceof HTMLInputElement;
      const current = isNative
        ? (el as HTMLInputElement).checked
        : el.getAttribute("aria-checked") === "true";
      if (current !== action.checked) {
        el.click();
        await waitForSettled(150, 800);
      }
      // Verify
      const after = isNative
        ? (el as HTMLInputElement).checked
        : el.getAttribute("aria-checked") === "true";
      if (after !== action.checked && isNative) {
        (el as HTMLInputElement).checked = action.checked;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const final = isNative
        ? (el as HTMLInputElement).checked
        : el.getAttribute("aria-checked") === "true";
      return final === action.checked
        ? { ok: true, note: `${action.checked ? "checked" : "unchecked"} ${action.fieldId}` }
        : { ok: false, note: `checkbox state did not stick on ${action.fieldId}` };
    }
    case "select_option": {
      const el = findField(action.fieldId);
      if (!el) return { ok: false, note: `field not found: ${action.fieldId}` };
      scrollIntoViewCenter(el);
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") || "";
      if (tag === "select") {
        setValue(el, action.value);
        const got = readValue(el);
        const sel = el as HTMLSelectElement;
        const selectedText = sel.selectedOptions?.[0]?.text?.trim().toLowerCase() || "";
        const ok =
          selectedText === action.value.trim().toLowerCase() ||
          got.toLowerCase() === action.value.trim().toLowerCase() ||
          selectedText.includes(action.value.trim().toLowerCase());
        return ok
          ? { ok: true, note: `selected "${action.value}"` }
          : { ok: false, note: `option "${action.value}" not found in native select` };
      }
      if (role === "radiogroup" || (el instanceof HTMLInputElement && el.type === "radio")) {
        return selectRadioOption(el, action.value);
      }
      // Custom combobox/listbox
      return await selectCustomOption(el, action.value);
    }
    case "upload_resume": {
      if (!filePayload) {
        return { ok: false, note: "no file payload — side panel must fetch the PDF first" };
      }
      const el = findField(action.fieldId);
      const input =
        el instanceof HTMLInputElement && el.type === "file"
          ? el
          : // The snapshot might have keyed a wrapper; find the file input inside.
            (el && (deepQueryAll<HTMLInputElement>("input[type=file]", el)[0] || null)) ||
            deepQueryAll<HTMLInputElement>("input[type=file]")[0] ||
            null;
      if (!input) return { ok: false, note: `file input not found: ${action.fieldId}` };
      const result = attachFile(input, filePayload.base64, filePayload.filename);
      await waitForSettled(400, 3000); // many ATSes parse the resume on attach
      return result;
    }
    case "scroll": {
      if (action.toFieldId) {
        const el = findField(action.toFieldId);
        if (el) {
          scrollIntoViewCenter(el);
          await waitForSettled(200, 1000);
          return { ok: true, note: `scrolled to ${action.toFieldId}` };
        }
      }
      const dy = (action.direction === "up" ? -1 : 1) * Math.round(window.innerHeight * 0.8);
      window.scrollBy({ top: dy, behavior: "instant" as ScrollBehavior });
      await waitForSettled(200, 1000);
      return { ok: true, note: `scrolled ${action.direction || "down"} to y=${Math.round(window.scrollY)}` };
    }
    case "click_at": {
      // GATED coordinate click: only allowed inside the rect of a field the
      // snapshot reported. This keeps the escape hatch from becoming a
      // general-purpose "click anywhere" (safety rail).
      const el = findField(action.fieldId);
      if (!el) return { ok: false, note: `click_at refused: unknown field ${action.fieldId}` };
      const r = el.getBoundingClientRect();
      const pad = 8; // small grace margin
      if (
        action.x < r.left - pad ||
        action.x > r.right + pad ||
        action.y < r.top - pad ||
        action.y > r.bottom + pad
      ) {
        return {
          ok: false,
          note: `click_at refused: (${action.x},${action.y}) outside ${action.fieldId} rect`,
        };
      }
      const target = (document.elementFromPoint(action.x, action.y) as HTMLElement) || el;
      target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: action.x, clientY: action.y }));
      target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: action.x, clientY: action.y }));
      target.click();
      await waitForSettled(250, 1500);
      return { ok: true, note: `clicked at (${action.x},${action.y}) in ${action.fieldId}` };
    }
    case "type_text": {
      const el = (document.activeElement as HTMLElement) || null;
      if (!el || el === document.body) {
        return { ok: false, note: "type_text refused: no focused element" };
      }
      setValue(el, action.text);
      await waitForSettled(150, 800);
      return { ok: true, note: `typed into ${el.tagName.toLowerCase()}` };
    }
    case "press_key": {
      const el = (document.activeElement as HTMLElement) || document.body;
      const opts = { key: action.key, bubbles: true, cancelable: true } as KeyboardEventInit;
      el.dispatchEvent(new KeyboardEvent("keydown", opts));
      el.dispatchEvent(new KeyboardEvent("keyup", opts));
      await waitForSettled(150, 800);
      return { ok: true, note: `pressed ${action.key}` };
    }
    case "click": {
      // Guardrail: only allow clicks on forward-progression buttons. The LLM
      // sometimes wanders to job listings or random links — we refuse.
      // Allowlist lives in ../shared/allowedButtons (single source, G9).
      const selectorText = action.selector.startsWith("text:")
        ? action.selector.slice("text:".length).trim()
        : "";
      if (selectorText && !isAllowedButtonLabel(selectorText)) {
        return { ok: false, note: `refused click on "${selectorText}" (not a recognised form-progression button)` };
      }
      const btn = findButton(action.selector);
      if (!btn) return { ok: false, note: `button not found: ${action.selector}` };
      scrollIntoViewCenter(btn);
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
        deepQueryAll<HTMLElement>("button[type=submit], input[type=submit]")[0] ||
        deepQueryAll<HTMLElement>("button, a[role=button]").find((b) =>
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
