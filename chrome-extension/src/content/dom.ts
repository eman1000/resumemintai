// Shadow-DOM-aware DOM helpers shared by snapshot.ts and executor.ts (G4).
//
// `deepQueryAll` walks open shadow roots recursively so custom-element-heavy
// ATSes (Workday, Ashby) expose their real inputs. Closed shadow roots are
// unreachable by design — the screenshot still shows them, and the planner
// can fall back to click_at for those.

/** querySelectorAll that pierces open shadow roots, depth-first. */
export function deepQueryAll<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  const out: T[] = [];
  const walk = (node: ParentNode) => {
    node.querySelectorAll<T>(selector).forEach((el) => out.push(el));
    // Recurse into open shadow roots of ALL elements under this node.
    node.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (el.shadowRoot) walk(el.shadowRoot);
    });
  };
  walk(root);
  return out;
}

/** Monotonic stamp so field ids stay stable across re-renders within a page
 * session (G10). We mark each discovered control with data-rm-id once; the
 * executor looks elements up by the same attribute instead of a positional
 * index that shifts when the SPA re-renders. */
let rmIdCounter = 0;

export function stampRmId(el: HTMLElement): string {
  const existing = el.getAttribute("data-rm-id");
  if (existing) return existing;
  const id = `rm${++rmIdCounter}`;
  el.setAttribute("data-rm-id", id);
  return id;
}

export function findByRmId(id: string): HTMLElement | null {
  const els = deepQueryAll<HTMLElement>(`[data-rm-id="${id}"]`);
  return els[0] || null;
}

/** Scroll an element into the middle of the viewport. */
export function scrollIntoViewCenter(el: HTMLElement): void {
  el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
}
