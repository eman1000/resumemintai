// Builds a slimmed-down DOM snapshot for the agent endpoint. Strips passwords
// and content from non-target forms so we don't leak data the user didn't
// intend to share with the server.

import type { AgentSnapshot, AgentField } from "../types";

const FIELD_SELECTOR = [
  "input:not([type=hidden]):not([type=password]):not([type=submit]):not([type=button])",
  "select",
  "textarea",
].join(",");

/** Unique-ish id for a field — prefer the element's own id/name, fall back to a hash. */
function fieldKey(el: HTMLElement): string {
  const id = (el as any).id?.trim();
  if (id) return id;
  const name = (el as any).name?.trim();
  if (name) return `name:${name}`;
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return `aria:${ariaLabel.slice(0, 60)}`;
  // Position-based fallback.
  const idx = Array.from(document.querySelectorAll(FIELD_SELECTOR)).indexOf(el);
  return `pos:${idx}`;
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
  // aria-label / placeholder
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  const placeholder = (el as any).placeholder;
  if (placeholder) return placeholder.trim();
  // Preceding text — look at previous sibling or parent's previous element.
  const prev = el.previousElementSibling?.textContent?.trim();
  if (prev && prev.length < 200) return prev;
  return (el as any).name || "";
}

/** "application_form" | "login" | "post_submit" | "unknown" */
function inferPageType(): string {
  const passwordFields = document.querySelectorAll("input[type=password]");
  const looksLikeLogin =
    passwordFields.length > 0 ||
    /sign in|log in|signin|login/i.test(document.title);
  const hasApplyForm =
    document.querySelector("form") &&
    document.querySelectorAll(FIELD_SELECTOR).length >= 3;
  if (looksLikeLogin && !hasApplyForm) return "login";
  if (hasApplyForm) return "application_form";
  if (/thank you|application submitted|successfully applied/i.test(document.body.innerText.slice(0, 2000))) {
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

export function buildSnapshot(): AgentSnapshot {
  const fieldEls = Array.from(
    document.querySelectorAll<HTMLElement>(FIELD_SELECTOR),
  ).filter((el) => {
    // Skip invisible / disabled / readonly.
    if ((el as any).disabled) return false;
    if ((el as any).readOnly) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    return true;
  });

  const fields: AgentField[] = fieldEls.slice(0, 80).map((el) => {
    const type =
      el.tagName.toLowerCase() === "select"
        ? "select"
        : el.tagName.toLowerCase() === "textarea"
          ? "textarea"
          : ((el as HTMLInputElement).type || "text").toLowerCase();

    let options: string[] | undefined;
    if (type === "select") {
      options = Array.from((el as HTMLSelectElement).options)
        .map((o) => o.text.trim())
        .filter(Boolean)
        .slice(0, 50);
    }

    return {
      id: fieldKey(el),
      label: labelFor(el).slice(0, 200),
      type,
      required: !!(el as any).required,
      options,
      placeholder: (el as any).placeholder || undefined,
      currentValue: ((el as any).value || "").slice(0, 200),
    };
  });

  const buttons = Array.from(
    document.querySelectorAll<HTMLElement>("button, input[type=submit], a[role=button]"),
  )
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

  return {
    url: location.href,
    title: document.title || "",
    pageType: inferPageType(),
    fields,
    buttons,
    bodyText: document.body.innerText.slice(0, 2000),
    ssoProviders: detectSsoProviders(),
  };
}
