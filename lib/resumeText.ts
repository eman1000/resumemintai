// lib/resumeText.ts
// Flatten a stored resume's JSON `data` into plain text for AI shortlisting.
// The builder's resume data shape varies across templates/versions, so we walk
// the structure and collect all human-readable string/number values rather than
// depending on a fixed schema.

export function resumeToPlainText(data: unknown): string {
  const out: string[] = [];
  const seen = new Set<string>();

  const skipKey = (k: string) =>
    /^(id|_id|key|type|renderer|color|colour|theme|variant|icon|url|href|src|width|height|align|style|className|order|visible|hidden)$/i.test(
      k,
    );

  const walk = (v: any) => {
    if (v == null) return;
    if (typeof v === "string") {
      const s = v.trim();
      if (s && s.length > 1 && !/^https?:\/\//i.test(s) && !/^#?[0-9a-f]{3,8}$/i.test(s)) {
        const key = s.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(s);
        }
      }
      return;
    }
    if (typeof v === "number") {
      out.push(String(v));
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (skipKey(k)) continue;
        walk(val);
      }
    }
  };

  walk(data);
  return out.join("\n").slice(0, 12000);
}
