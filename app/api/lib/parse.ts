// app/lib/parse.ts
export type CVSectionKey =
  | "personalDetails" | "profile" | "employment" | "educations" | "skills" | "languages"
  | "hobbies" | "qualities" | "courses" | "certificates" | "internships" | "sideActivities"
  | "achievements" | "references" | "signature" | "footer";

export interface CVField { key: string; role: string; fieldType?: string }
export interface CVRecord { key: string; values: any[] }
export interface CVSection { key: CVSectionKey; title: string; fields: CVField[]; records: CVRecord[]; description?: string }

export function normalizeSkills(raw: unknown): string[] {
  const pieces: string[] = [];

  const pushChunk = (s?: string) => {
    const t = String(s || "").trim();
    if (!t) return;

    // If it looks like "Category: a, b, c" keep only the right side
    const afterColon = t.includes(":") ? t.split(":").slice(1).join(":") : t;

    // Split on common list delimiters: comma, middot, bullet, pipe, slash, semicolon, newline
    afterColon
      .split(/[,\u00B7\u2022|/;•\n]+/g)  // , · • | / ; (and literal bullet)
      .map(x => x.trim())
      .filter(Boolean)
      .forEach(x => pieces.push(x));
  };

  if (Array.isArray(raw)) {
    raw.forEach(item => {
      if (typeof item === "string") pushChunk(item);
      else if (Array.isArray(item)) item.forEach(v => pushChunk(String(v)));
      else if (item != null) pushChunk(String(item));
    });
  } else if (typeof raw === "string") {
    // First split by strong separators to break big category blocks
    raw.split(/[\u00B7\u2022•|]+/g).forEach(pushChunk);
  } else if (raw != null) {
    pushChunk(String(raw));
  }

  // De-dupe + drop sentences that are too long to be “a skill”
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pieces) {
    const s = p.replace(/\s+/g, " ").trim();
    if (!s) continue;
    if (s.length > 80) continue; // avoid category sentences
    if (!seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}

export function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

export function mapOutToSections(out: any): CVSection[] {
  const secs: CVSection[] = [];

if (out?.personalDetails) {
  secs.unshift({
    key: "personalDetails",
    title: "Personal details",
    fields: [],
    records: [{ key: "pd-1", values: {
      givenName: out.personalDetails.fullName?.split(" ").slice(0,1).join(""),
      familyName: out.personalDetails.fullName?.split(" ").slice(1).join(" "),
      email: out.personalDetails.email,
      phone: out.personalDetails.phone,
      address: out.personalDetails.location?.[0],
      city: out.personalDetails.location?.[1],
      // etc…
    } }],
  });
}
  if (out?.profile?.headline != null || out?.profile?.summary != null) {
    secs.push({
      key: "profile",
      title: "Profile",
      fields: [
        { key: "h", role: "header" },          // headline
        { key: "v", role: "richtextValue" },   // summary
      ],
      records: [{
        key: "p1",
        values: [
          out.profile.headline ?? out.personalDetails?.headline ?? "", // index 0
          out.profile.summary ?? "",                                   // index 1
        ],
      }],
    });
  } else if (out?.personalDetails?.headline) {
    // If only PD has headline, still create the 2-slot profile so UI is stable
    secs.push({
      key: "profile",
      title: "Profile",
      fields: [
        { key: "h", role: "header" },
        { key: "v", role: "richtextValue" },
      ],
      records: [{ key: "p1", values: [out.personalDetails.headline, ""] }],
    });
  }


  if (Array.isArray(out?.employment) && out.employment.length) {
    secs.push({
      key: "employment",
      title: "Employment",
      fields: [
        { key: "h", role: "header" },
        { key: "sub", role: "subheader" },
        { key: "city", role: "city" },            // ← add city at index 2
        { key: "per", role: "period" },
        { key: "rich", role: "richtextValue" },
      ],
      records: out.employment.map((e: any, i: number) => ({
        key: `e${i+1}`,
        values: [
          e.role || "",
          e.company || "",
          e.location || "",                        // ← empty or parsed location
          Array.isArray(e.period) ? e.period : [e.period || "", ""],
          e.bullets?.length
            ? `<ul>${e.bullets.map((b: string)=>`<li>${escapeHtml(b)}</li>`).join("")}</ul>`
            : "",
        ],
      })),
    });
  }

  if (Array.isArray(out?.educations) && out.educations.length) {
    secs.push({
      key: "educations",
      title: "Education",
      fields: [
        { key: "h", role: "header" },
        { key: "sub", role: "subheader" },
        { key: "city", role: "city" },            // ← add city at index 2
        { key: "per", role: "period" },
        { key: "rich", role: "richtextValue" },   // optional detail line
      ],
      records: out.educations.map((e: any, i: number) => ({
        key: `ed${i+1}`,
        values: [
          e.degree || "",
          e.school || "",
          e.location || "",                        // ← empty or parsed location
          Array.isArray(e.period) ? e.period : [e.period || "", ""],
          (e.details && e.details.length)
            ? `<ul>${e.details.map((d: string)=>`<li>${escapeHtml(d)}</li>`).join("")}</ul>`
            : "",
        ],
      })),
    });
  }


if (out?.skills != null) {
  const items = normalizeSkills(out.skills);
  if (items.length) {
    secs.push({
      key: "skills",
      title: "Skills",
      // one simple text field per record
      fields: [{ key: "h", role: "header" }],
      // ⬇️ one record per skill -> gives you multiple inputs in the editor
      records: items.map((s: string, i: number) => ({
        key: `s${i + 1}`,
        values: [s],
      })),
    });
  }
}



  if (Array.isArray(out?.languages) && out.languages.length) {
    secs.push({
      key: "languages",
      title: "Languages",
      fields: [{ key: "h", role: "header" }],
      records: [{ key: "l1", values: [out.languages.join(" · ")] }],
    });
  }

  if (Array.isArray(out?.achievements) && out.achievements.length) {
    secs.push({
      key: "achievements",
      title: "Achievements",
      fields: [{ key: "h", role: "header" }],
      records: out.achievements.map((a: string, i: number)=>({ key:`a${i+1}`, values:[a]})),
    });
  }

  if (Array.isArray(out?.references) && out.references.length) {
    secs.push({
      key: "references",
      title: "References",
      fields: [{ key: "h", role: "header" }],
      records: out.references.map((r: string, i: number)=>({ key:`r${i+1}`, values:[r]})),
    });
  }

  // You can also return `personalDetails` to prefill your left panel state if desired.

  return secs;
}
