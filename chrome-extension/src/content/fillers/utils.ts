// Field-fill helpers shared across all filler implementations.

/** Dispatch React-friendly input event so controlled inputs accept the value. */
export function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  if (value == null) return;
  const proto = el.tagName === "SELECT"
    ? Object.getPrototypeOf(el)
    : el.tagName === "TEXTAREA"
    ? Object.getPrototypeOf(el)
    : Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (desc?.set) desc.set.call(el, value);
  else (el as any).value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

/** Find an input/textarea/select whose label, placeholder, name, or aria-label
 *  matches one of the provided regexes. Returns the first match. */
export function findField(matchers: RegExp[]): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select"
    ),
  );
  for (const el of inputs) {
    if (el.disabled || el.type === "hidden" || el.type === "file") continue;
    const haystacks: string[] = [];
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) haystacks.push(lbl.textContent || "");
    }
    haystacks.push(el.getAttribute("aria-label") || "");
    haystacks.push(el.getAttribute("placeholder") || "");
    haystacks.push(el.getAttribute("name") || "");
    haystacks.push(el.id || "");
    // Walk up a few parents for a label text
    let p: HTMLElement | null = el.parentElement;
    for (let depth = 0; depth < 3 && p; depth++) {
      const lbl = p.querySelector("label");
      if (lbl && (lbl as HTMLElement).innerText) haystacks.push((lbl as HTMLElement).innerText);
      p = p.parentElement;
    }
    const hay = haystacks.join(" · ").toLowerCase();
    for (const rx of matchers) {
      if (rx.test(hay)) return el;
    }
  }
  return null;
}

/** Best-effort full-name → first/last split used when a form has a single
 *  "Full name" field vs. separate first / last. */
export function splitName(full: string): { first: string; last: string } {
  const t = String(full || "").trim();
  if (!t) return { first: "", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}
