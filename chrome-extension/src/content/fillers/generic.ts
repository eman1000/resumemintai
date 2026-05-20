// Generic AI-driven filler. Scrapes every input/textarea/select with a
// detectable label, sends them to /api/extension/fill-fields with the
// user's resume, and applies the returned values.

import type { FlatResume, AiField } from "../../types";
import { aiFillFields } from "../../lib/api";
import { setValue } from "./utils";

type Tracked = {
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  field: AiField;
};

function deriveLabel(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  if (el.id) {
    const lbl = document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`);
    if (lbl?.textContent) return lbl.textContent.trim();
  }
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  let p: HTMLElement | null = el.parentElement;
  for (let i = 0; i < 4 && p; i++) {
    const lbl = p.querySelector("label");
    if (lbl?.textContent) return lbl.textContent.trim();
    p = p.parentElement;
  }
  return el.getAttribute("placeholder") || el.getAttribute("name") || el.id || "";
}

export async function fillGeneric(resume: FlatResume): Promise<number> {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  );

  const tracked: Tracked[] = [];
  inputs.forEach((el, i) => {
    if (el.disabled) return;
    if ((el as HTMLInputElement).type === "hidden") return;
    if ((el as HTMLInputElement).type === "file") return;
    if ((el as HTMLInputElement).type === "checkbox") return;
    if ((el as HTMLInputElement).type === "radio") return;
    const label = deriveLabel(el);
    if (!label) return;
    const id = `f${i}`;
    el.setAttribute("data-rm-field", id);
    const field: AiField = {
      id,
      label,
      placeholder: el.getAttribute("placeholder") || undefined,
      type: el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : (el as HTMLInputElement).type,
      options:
        el.tagName === "SELECT"
          ? Array.from((el as HTMLSelectElement).options)
              .map((o) => o.text || o.value)
              .filter(Boolean)
          : undefined,
    };
    tracked.push({ el, field });
  });

  if (tracked.length === 0) return 0;

  // Limit so we don't blow the prompt budget on huge forms.
  const batch = tracked.slice(0, 60);
  const values = await aiFillFields(
    batch.map((t) => t.field),
    resume,
    { url: location.href, title: document.title },
  );

  let filled = 0;
  for (const { el, field } of batch) {
    const v = values[field.id];
    if (!v) continue;
    setValue(el, v);
    filled += 1;
  }
  return filled;
}
