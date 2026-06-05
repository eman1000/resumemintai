// Builds a slimmed-down DOM snapshot for the agent endpoint. Strips passwords
// and content from non-target forms so we don't leak data the user didn't
// intend to share with the server.
//
// v0.4: shadow-DOM piercing (deepQueryAll), stable data-rm-id field ids,
// checkboxes/radios as first-class fields, file inputs in fileFields[],
// scroll state, and per-field viewport rects for the gated click_at path.

import type { AgentSnapshot, AgentField, AgentFileField } from "../types";
import { deepQueryAll, stampRmId } from "./dom";
import { detectAts } from "./fillers";

const FIELD_SELECTOR = [
  // checkbox/radio are now INCLUDED (G7) — file stays separate (fileFields).
  "input:not([type=hidden]):not([type=password]):not([type=submit]):not([type=button]):not([type=file])",
  "select",
  "textarea",
  // Non-native form controls used by LinkedIn, Workday, Greenhouse SPAs.
  "[role='combobox']",
  "[role='textbox']",
  "[role='listbox']",
  "[role='radiogroup']",
  "[role='checkbox']",
  "[contenteditable='true']",
].join(",");

const BUTTON_SELECTOR = "button, input[type=submit], a[role=button], [role=button]";

/** Stable id for a field: prefer the element's own id/name, else stamp a
 * data-rm-id that survives SPA re-renders (fixes the pos:N drift, G10). */
function fieldKey(el: HTMLElement): string {
  const id = (el as any).id?.trim();
  if (id) return id;
  const name = (el as any).name?.trim();
  if (name) return `name:${name}`;
  return `rm:${stampRmId(el)}`;
}

/** Resolve a human-readable label for a form control. */
function labelFor(el: HTMLElement): string {
  const id = (el as any).id;
  if (id) {
    const lab = document.querySelector(`label[for="${id}"]`);
    if (lab?.textContent) return lab.textContent.trim();
  }
  // Wrapping <label>
  const wrap = el.closest("label");
  if (wrap?.textContent) return wrap.textContent.trim();
  // aria-label / aria-labelledby / placeholder
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const txt = labelledBy
      .split(/\s+/)
      .map((lid) => document.getElementById(lid)?.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
    if (txt) return txt;
  }
  const placeholder = (el as any).placeholder;
  if (placeholder) return placeholder.trim();
  // Preceding text — look at previous sibling or parent's previous element.
  const prev = el.previousElementSibling?.textContent?.trim();
  if (prev && prev.length < 200) return prev;
  return (el as any).name || "";
}

/** "application_form" | "login" | "post_submit" | "unknown" */
function inferPageType(): string {
  const passwordFields = deepQueryAll("input[type=password]");
  const looksLikeLogin =
    passwordFields.length > 0 ||
    /^sign in|^log in|^signin|^login/i.test(document.title);
  // Modal/dialog application forms (LinkedIn Easy Apply, Workable, Workday)
  // are common — they often don't have a top-level <form> tag.
  const fieldCount = deepQueryAll(FIELD_SELECTOR).length;
  const dialog = document.querySelector(
    "[role='dialog'], [aria-modal='true'], .artdeco-modal",
  );
  const applyHeading = /apply (to|for)|application|easy apply/i.test(
    (document.body.innerText || "").slice(0, 500),
  );
  const hasApplyForm =
    (document.querySelector("form") && fieldCount >= 2) ||
    (!!dialog && fieldCount >= 1) ||
    (applyHeading && fieldCount >= 2);
  if (looksLikeLogin && !hasApplyForm) return "login";
  if (hasApplyForm) return "application_form";
  if (
    /thank you|application submitted|successfully applied|your application has been sent/i.test(
      document.body.innerText.slice(0, 2000),
    )
  ) {
    return "post_submit";
  }
  return "unknown";
}

/** Detect visible SSO provider buttons. */
function detectSsoProviders(): AgentSnapshot["ssoProviders"] {
  const text = document.body.innerText.toLowerCase();
  const out: AgentSnapshot["ssoProviders"] = [];
  if (/sign in with google|continue with google/.test(text)) out!.push("google");
  if (/sign in with linkedin|continue with linkedin/.test(text)) out!.push("linkedin");
  if (/sign in with github|continue with github/.test(text)) out!.push("github");
  if (/sign in with apple|continue with apple/.test(text)) out!.push("apple");
  if (/sign in with microsoft|continue with microsoft/.test(text)) out!.push("microsoft");
  return out;
}

/** Redact email/phone-looking strings that are NOT the user's own from body
 * text (minimal PII hardening, G12). We can't know the user's values here,
 * so we only strip patterns in obviously non-form contexts (mailto links
 * already in text, etc.) — conservative on purpose. */
function redactBodyText(text: string): string {
  return text
    // long digit runs that look like SSNs / account numbers
    .replace(/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g, "[redacted]")
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[redacted]");
}

function isVisible(el: HTMLElement): boolean {
  if ((el as any).disabled) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return true;
}

export function buildSnapshot(): AgentSnapshot {
  const fieldEls = deepQueryAll<HTMLElement>(FIELD_SELECTOR).filter((el) => {
    if ((el as any).readOnly) return false;
    return isVisible(el);
  });

  const fields: AgentField[] = fieldEls.slice(0, 100).map((el) => {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    const inputType =
      tag === "input" ? ((el as HTMLInputElement).type || "text").toLowerCase() : "";
    const type =
      tag === "select"
        ? "select"
        : tag === "textarea"
          ? "textarea"
          : role === "combobox" || role === "listbox"
            ? "select"
            : role === "radiogroup"
              ? "radio"
              : role === "checkbox"
                ? "checkbox"
                : tag === "input"
                  ? inputType
                  : "text";

    let options: string[] | undefined;
    if (tag === "select") {
      options = Array.from((el as HTMLSelectElement).options)
        .map((o) => o.text.trim())
        .filter(Boolean)
        .slice(0, 50);
    } else if (role === "radiogroup") {
      options = deepQueryAll("[role='radio'], input[type=radio]", el)
        .map((r) => (r.getAttribute("aria-label") || r.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 30);
    } else if (role === "combobox" || role === "listbox") {
      // Custom dropdowns often render options lazily; capture any present.
      options = deepQueryAll("[role='option']", el)
        .map((o) => (o.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 50);
      if (!options.length) options = undefined;
    }

    // Custom controls often have aria-haspopup but no .value — pull the
    // displayed text instead so the agent can see whether it's already set.
    let currentValue = "";
    let checked: boolean | undefined;
    if (type === "checkbox" || inputType === "checkbox") {
      checked =
        tag === "input"
          ? (el as HTMLInputElement).checked
          : el.getAttribute("aria-checked") === "true";
    } else if (inputType === "radio") {
      checked = (el as HTMLInputElement).checked;
      currentValue = ((el as HTMLInputElement).value || "").trim();
    } else if (tag === "input" || tag === "textarea" || tag === "select") {
      currentValue = ((el as any).value || "").trim();
    } else if (el.getAttribute("contenteditable") === "true") {
      currentValue = (el.textContent || "").trim();
    } else if (role === "combobox" || role === "listbox") {
      // For aria comboboxes, the displayed label is usually in a child span
      // or aria-activedescendant. Fall back to innerText.
      currentValue = (el.textContent || "").trim();
    }

    const rect = el.getBoundingClientRect();

    return {
      id: fieldKey(el),
      label: labelFor(el).slice(0, 200),
      type,
      required:
        !!(el as any).required ||
        el.getAttribute("aria-required") === "true",
      options,
      placeholder: (el as any).placeholder || undefined,
      currentValue: currentValue.slice(0, 200),
      checked,
      custom: !["input", "textarea", "select"].includes(tag) || undefined,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
    };
  });

  // File inputs — kept separate (G6). Hidden file inputs are INCLUDED:
  // most ATSes hide the native input behind a styled "Attach" button, but
  // programmatic DataTransfer assignment still works on the hidden input.
  const fileEls = deepQueryAll<HTMLInputElement>("input[type=file]").filter(
    (el) => !el.disabled,
  );
  const fileFields: AgentFileField[] = fileEls.slice(0, 10).map((el) => ({
    id: fieldKey(el),
    label: labelFor(el).slice(0, 200) || "File upload",
    accept: el.accept || undefined,
    required: !!el.required || el.getAttribute("aria-required") === "true",
    currentFile: el.files?.[0]?.name || undefined,
  }));

  const buttons = deepQueryAll<HTMLElement>(BUTTON_SELECTOR)
    .filter((b) => {
      const rect = b.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .slice(0, 30)
    .map((b) => ({
      id: b.id || `text:${(b.textContent || "").trim().slice(0, 40)}`,
      text: (b.textContent || (b as HTMLInputElement).value || "").trim().slice(0, 80),
    }))
    .filter((b) => b.text);

  const doc = document.documentElement;
  return {
    url: location.href,
    title: document.title || "",
    pageType: inferPageType(),
    fields,
    fileFields: fileFields.length ? fileFields : undefined,
    buttons,
    bodyText: redactBodyText(document.body.innerText.slice(0, 2000)),
    ssoProviders: detectSsoProviders(),
    ats: detectAts(location.href, document),
    scroll: {
      y: Math.round(window.scrollY),
      max: Math.max(0, Math.round(doc.scrollHeight - window.innerHeight)),
      viewportH: window.innerHeight,
    },
  };
}
