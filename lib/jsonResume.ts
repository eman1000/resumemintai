// lib/jsonResume.ts
//
// Converts a stored ResumeMint resume (section-based, values may be positional
// ARRAYS keyed by each section's `fields` roles, or objects) into the open
// JSON Resume schema (https://jsonresume.org/schema). JSON Resume themes
// (pure HTML/CSS, ATS-readable) render from this — replacing the old SVG
// templates that produced zero ATS-extractable text.

type AnyRec = Record<string, any>;

function sectionByKey(data: AnyRec, key: string): AnyRec | undefined {
  const norm = (k: string) => String(k || "").toLowerCase().replace(/\s+/g, "");
  return (data?.sections || []).find((s: AnyRec) => norm(s?.key) === norm(key));
}

/** Read a record's value for a role, supporting array (positional, via the
 * section's `fields` role defs) and object shapes. */
function val(section: AnyRec | undefined, rec: AnyRec, role: string): any {
  if (!rec) return undefined;
  const v = rec.values;
  if (Array.isArray(v)) {
    const defs: AnyRec[] = Array.isArray(section?.fields) ? section!.fields : [];
    const i = defs.findIndex((f) => (f?.role || f?.key) === role);
    return i >= 0 ? v[i] : undefined;
  }
  if (v && typeof v === "object") return v[role];
  return undefined;
}

function stripHtml(h: any): string {
  return String(h || "")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function highlights(h: any): string[] {
  const out: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(h || "")))) out.push(stripHtml(m[1]));
  if (out.length) return out.filter(Boolean);
  const plain = stripHtml(h);
  return plain ? plain.split(/\n+/).map((s) => s.trim()).filter(Boolean) : [];
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Normalise "Jan 2022", "2015", "01/2022" → JSON Resume YYYY-MM-DD. Returns
 * "" for present/empty so themes treat the role as current. */
function isoDate(raw: any): string {
  const s = String(raw || "").trim();
  if (!s || /present|current|now/i.test(s)) return "";
  let m = s.match(/([A-Za-z]{3,})\.?\s+(\d{4})/); // "Jan 2022"
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo) return `${m[2]}-${mo}-01`;
  }
  m = s.match(/^(\d{1,2})[\/\-](\d{4})$/); // "01/2022"
  if (m) return `${m[2]}-${String(m[1]).padStart(2, "0")}-01`;
  m = s.match(/^(\d{4})-(\d{2})/); // already ISO-ish
  if (m) return s.slice(0, 10);
  m = s.match(/^(\d{4})$/); // year only
  if (m) return `${m[1]}-01-01`;
  return s; // last resort: pass through
}

function period(section: AnyRec | undefined, rec: AnyRec): { start: string; end: string } {
  const p = val(section, rec, "period");
  if (Array.isArray(p)) return { start: isoDate(p[0]), end: isoDate(p[1]) };
  const s = String(p || "");
  const [a, b] = s.split(/\s*[-–—]\s*|\s+to\s+/i);
  return { start: isoDate(a), end: isoDate(b) };
}

export type JsonResume = {
  basics: AnyRec;
  work: AnyRec[];
  education: AnyRec[];
  skills: AnyRec[];
  languages: AnyRec[];
  projects: AnyRec[];
  certificates: AnyRec[];
  awards: AnyRec[];
};

/** Split a "Next.js · Node.js / OpenAI, Stripe" stack/keyword line into items.
 * Mirrors the skill splitter: comma/middot/bullet/pipe/semicolon, and a slash
 * ONLY when spaced (so "A/B testing", "CI/CD" survive). */
function splitKeywords(raw: any): string[] {
  return String(raw || "")
    .split(/[,·•|;•\n]+|\s+\/\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toJsonResume(data: AnyRec): JsonResume {
  data = data && typeof data === "object" ? data : {};

  // ---- basics (personal details) ----
  const pdSec = sectionByKey(data, "personaldetails");
  const pd: AnyRec = pdSec?.records?.[0]?.values || {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = Array.isArray(pd) ? undefined : pd[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return "";
  };
  const profSec = sectionByKey(data, "profile");
  const profRec = profSec?.records?.[0];
  const label = profRec ? String(val(profSec, profRec, "header") || "").trim() : "";
  const summary = profRec ? stripHtml(val(profSec, profRec, "richtextValue")) : "";

  const profiles: AnyRec[] = [];
  const ln = pick("linkedin", "linkedIn");
  const gh = pick("github");
  if (ln) profiles.push({ network: "LinkedIn", url: ln.startsWith("http") ? ln : `https://${ln}`, username: "" });
  if (gh) profiles.push({ network: "GitHub", url: gh.startsWith("http") ? gh : `https://${gh}`, username: "" });

  // Avatar: JSON Resume themes that support a photo read basics.image.
  const photo =
    pick("photoUrl") ||
    (pd && typeof pd === "object" && pd.photo && (pd.photo.url || (typeof pd.photo === "string" ? pd.photo : ""))) ||
    "";

  const basics: AnyRec = {
    name: [pick("givenName"), pick("familyName")].filter(Boolean).join(" ") || String(data.title || "").trim(),
    label,
    image: photo || undefined,
    email: pick("email"),
    phone: pick("phone"),
    url: pick("website"),
    summary,
    location: {
      address: pick("address"),
      city: pick("city"),
      postalCode: pick("postalCode"),
      countryCode: "",
      region: pick("country"),
    },
    profiles,
  };

  // ---- work ----
  const empSec = sectionByKey(data, "employment");
  const work = (empSec?.records || []).map((r: AnyRec) => {
    const { start, end } = period(empSec, r);
    return {
      name: String(val(empSec, r, "subheader") || "").trim(),
      position: String(val(empSec, r, "header") || "").trim(),
      location: String(val(empSec, r, "city") || "").trim(),
      startDate: start,
      endDate: end,
      highlights: highlights(val(empSec, r, "richtextValue")),
      summary: "",
    };
  }).filter((w: AnyRec) => w.position || w.name);

  // ---- education ----
  const eduSec = sectionByKey(data, "educations") || sectionByKey(data, "education");
  const education = (eduSec?.records || []).map((r: AnyRec) => {
    const { start, end } = period(eduSec, r);
    return {
      institution: String(val(eduSec, r, "subheader") || "").trim(),
      area: String(val(eduSec, r, "header") || "").trim(),
      studyType: "",
      startDate: start,
      endDate: end,
    };
  }).filter((e: AnyRec) => e.institution || e.area);

  // ---- skills ----
  const skSec = sectionByKey(data, "skills");
  const skills = (skSec?.records || [])
    .map((r: AnyRec) => ({
      name: String(val(skSec, r, "header") || "").trim(),
      level: String(val(skSec, r, "level") || "").trim(),
      // Optional comma list → JSON Resume keywords. When present, the skill is a
      // CATEGORY (e.g. "Backend & APIs") and keywords are its items, so themes
      // render the grouped "category: a, b, c" layout.
      keywords: splitKeywords(val(skSec, r, "keywords")),
    }))
    .filter((s: AnyRec) => s.name || s.keywords.length);

  // ---- languages ----
  const langSec = sectionByKey(data, "languages");
  const languages = (langSec?.records || [])
    .map((r: AnyRec) => ({
      language: String(val(langSec, r, "header") || "").trim(),
      fluency: String(val(langSec, r, "level") || "").trim(),
    }))
    .filter((l: AnyRec) => l.language);

  // ---- projects (e.g. "Selected AI & Product Work") ----
  const projSec =
    sectionByKey(data, "projects") ||
    sectionByKey(data, "selectedwork") ||
    sectionByKey(data, "selectedaiproductwork");
  const projects = (projSec?.records || []).map((r: AnyRec) => {
    const { start, end } = period(projSec, r);
    return {
      name: String(val(projSec, r, "header") || "").trim(),
      description: "",
      // The italic stack/tech line is stored in subheader → JSON Resume keywords.
      keywords: splitKeywords(val(projSec, r, "subheader")),
      highlights: highlights(val(projSec, r, "richtextValue")),
      startDate: start,
      endDate: end,
      url: "",
    };
  }).filter((p: AnyRec) => p.name || p.highlights.length);

  // ---- certificates / certifications ----
  const certSec = sectionByKey(data, "certificates") || sectionByKey(data, "certifications");
  const certificates = (certSec?.records || []).map((r: AnyRec) => {
    const { start } = period(certSec, r);
    return {
      name: String(val(certSec, r, "header") || "").trim(),
      issuer: String(val(certSec, r, "subheader") || "").trim(),
      date: start,
    };
  }).filter((c: AnyRec) => c.name);

  // ---- awards / achievements ----
  const awardSec = sectionByKey(data, "awards") || sectionByKey(data, "achievements");
  const awards = (awardSec?.records || []).map((r: AnyRec) => {
    const { start } = period(awardSec, r);
    return {
      title: String(val(awardSec, r, "header") || "").trim(),
      awarder: String(val(awardSec, r, "subheader") || "").trim(),
      date: start,
      summary: stripHtml(val(awardSec, r, "richtextValue")),
    };
  }).filter((a: AnyRec) => a.title);

  return { basics, work, education, skills, languages, projects, certificates, awards };
}

/** True if the resume has real renderable content. */
export function jsonResumeHasContent(jr: JsonResume): boolean {
  return !!(jr.basics?.name || jr.work?.length || jr.education?.length || jr.skills?.length);
}
