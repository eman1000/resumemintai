// components/cvwizard-adapter.ts
import type { CircularProps, Section, RecordItem } from "../CircularTemplate";
import draftToHtml from "draftjs-to-html";
const SKILL_LEVEL_ALIAS: Record<string, string> = {
  "beginner": "1",
  "novice": "1",
  "moderate": "2",
  "intermediate": "3",           // keep both, in case you use this word
  "good": "3",
  "very good": "4",
  "advanced": "4",
  "excellent": "5",
  "expert": "5",
};

const LANG_LEVEL_ALIAS: Record<string, string> = {
  "basic": "1",
  "elementary": "1",
  "conversational": "3",
  "working proficiency": "3",
  "fluent": "4",
  "professional": "4",
  "native": "5",
  "bilingual": "5",
};
const stripHtml = (s?: string) =>
  String(s || "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** pull list items out of <ul><li>…</li></ul> or lines */
const htmlToBullets = (s?: string): string[] => {
  if (!s) return [];
  const lis = Array.from(s.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map(m => stripHtml(m[1]))
    .filter(Boolean);
  return lis; // <= strict: if no <li>, return []
};
const splitName = (full?: string) => {
  const t = String(full || "").trim();
  if (!t) return { first: "Your", last: "Name" };
  const parts = t.split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(" ") || "" };
};

type RawDraft = { blocks: any[]; entityMap: any };
const rawToHtml = (maybe: any): string | undefined =>
  (maybe && typeof maybe === "object" && maybe.kind === "draftjs-raw" && maybe.raw)
    ? draftToHtml(maybe.raw as RawDraft)
    : undefined;

type ListExtract = { itemsHtml: string[]; ordered: boolean } | null;

const extractList = (html?: string): ListExtract => {
  if (!html) return null;
  const hasOL = /<\s*ol\b/i.test(html);
  const hasUL = /<\s*ul\b/i.test(html);
  if (!hasOL && !hasUL) return null;

  const itemsHtml = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map(m => String(m[1]).trim())
    .filter(Boolean);

  if (!itemsHtml.length) return null;
  return { itemsHtml, ordered: !!hasOL };
};

/** map editor section → renderer section */
const coalesce = (...xs: any[]) => xs.find(v => v !== undefined && v !== null && String(v).trim() !== "");

function normalizeLevel(raw: any, domain?: "skills" | "languages"): string | undefined {
  if (raw == null) return undefined;

  if (typeof raw === "number") {
    if (raw <= 5) return String(Math.max(1, Math.min(5, Math.round(raw))));
    const step = Math.max(1, Math.min(5, Math.round((raw / 100) * 5)));
    return String(step);
  }

  if (typeof raw === "string") {
    const t = raw.trim();
    // numeric-as-text
    const n = Number(t);
    if (!Number.isNaN(n)) return normalizeLevel(n, domain);

    const k = t.toLowerCase();
    const mapped =
      (domain === "languages" ? LANG_LEVEL_ALIAS[k] : SKILL_LEVEL_ALIAS[k]) ??
      SKILL_LEVEL_ALIAS[k]; // last chance: allow skill aliases everywhere
    return mapped ?? t; // if unknown, pass through for text display
  }

  if (typeof raw === "object") {
    if (raw.label) return normalizeLevel(String(raw.label), domain);
    if (raw.name)  return normalizeLevel(String(raw.name), domain);
    if (raw.value != null) return normalizeLevel(raw.value, domain);
  }
  return undefined;
}

function mapEditorSection(sec: any): Section {
  const records: RecordItem[] = (sec.records || []).map((r: any) => {
    // Prefer named fields, then plain values object, else {}
    const vals =
      r?.fields ??
      (r?.values?.fields ?? (typeof r?.values === "object" && !Array.isArray(r?.values) ? r?.values : {})) ??
      {};

    // 🧠 If values is an array (e.g. ["JS", "Advanced"]), peek at index 1 for level
    const arrayLevel = Array.isArray(r?.values) ? r.values[1] : undefined;

    const header =
      vals.header ??
      vals.position ?? vals.education ?? vals.skill ?? vals.language ?? vals.hobby ?? vals.course ?? "";

    const subRaw = vals.subheader ?? vals.employer ?? vals.school ?? "";
    const city   = vals.city ?? "";                   // 👈 pick up city if present
    const sub    = [subRaw, city].filter(Boolean).join(", ");   // 👈 append city
    
    // period normalize
    const perRaw = vals.period;
    let period = "";
    if (Array.isArray(perRaw)) period = perRaw.filter(Boolean).join(" – ");
    else if (perRaw) period = String(perRaw);

    // rich text
    const richCandidate = vals.richtextValue ?? vals.description ?? vals.value ?? "";
    const html = typeof richCandidate === "string" ? richCandidate : rawToHtml(richCandidate);

    const list = extractList(html);
    const bulletsHtml = list ? list.itemsHtml : undefined;

    // 🔑 LEVEL — include array fallback and lots of common aliases
    const rawLevel = coalesce(
      arrayLevel,                    // <— NEW: values[1] when values is array
      vals.level, vals.lvl,
      vals.proficiency, vals.proficiencyLevel,
      vals.rating, vals.rate, vals.score, vals.strength,
      r?.level, r?.lvl, r?.proficiency, r?.rating, r?.score,
      r?.values?.level,             // named level on values object, if any
      r?.fields?.level   
    );
    const isLang = String(sec.key || "").toLowerCase() === "languages";

    const level = normalizeLevel(rawLevel, isLang ? "languages" : "skills");

    // (Optional) quick trace for one run
    if ((sec.key || "").toLowerCase() === "skills") {
      // eslint-disable-next-line no-console
      
    }

    return {
      header: header ? String(header) : undefined,
      subheader: sub ? String(sub) : undefined,
      period: period || undefined,
      bulletsHtml,
      listType: list ? (list.ordered ? "ol" : "ul") : undefined,
      richtextValue: list ? undefined : (html ? String(html) : undefined),
      value: undefined,
      level: level ? String(level) : undefined, // ✅ will now be set
    };
  });

  return {
    key: String(sec.key || "").toLowerCase(),
    title: sec.title || undefined,
    records,
  };
}



const prettyUrl = (u?: string) =>
  String(u || "")
    .trim()
    .replace(/^(https?:)?\/\//i, "")  // drop http(s):// or protocol-relative //
    .replace(/^mailto:/i, "")
    .replace(/^tel:/i, "")
    .replace(/\/+$/,"");              // optional: trim trailing slash


/** build the personal details section for the rail */
function buildPersonalDetailsSection(td: any): Section {
  const pd: RecordItem[] = [];
  const push = (v?: string, pdKey?: string) => v && pd.push({ header: v, pdKey });

    const sectionTitle =
    td.personalDetailsTitle /* e.g. "个人信息" */ ||
    "Personal details";
  // Known, nicely formatted items first
  push(td.emailaddress, "email");
  push(td.phonenumber, "phone");

  const addr = Array.isArray(td.address) ? td.address.filter(Boolean).join(", ") : "";
  push(addr, "address");

  if (td["/footer"]) {
    td["/footer"]
      .split("·")
      .map((s: string) => prettyUrl(s))
      .filter(Boolean)
      .forEach(push);
  } else {
    push(prettyUrl(td.website));
    push(prettyUrl(td.linkedin));
  }

  // --- Render ANY extra personal details that exist ---
  // Extra PD fields
  const map = td.personalDetails || {};
  const ignore = new Set([
    "givenName","familyName","desiredJobPosition",
    "email","phone","address","city","postalCode",
    "website","linkedin","photo","photoUrl"
  ]);

  const labelize = (k: string) =>
    k.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")
     .replace(/\s+/g," ").trim().replace(/\b\w/g, m => m.toUpperCase());

  const fmt = (val: any): string => {
    if (val == null) return "";
    if (typeof val === "string") return val.trim();
    if (Array.isArray(val)) return val.filter(Boolean).join(", ");
    if (typeof val === "object" && ("month" in val || "year" in val || "present" in val)) {
      const m = val.month || "";
      const y = val.present ? "Present" : (val.year || "");
      return [m, y].filter(Boolean).join(" ");
    }
    return String(val);
  };

  Object.entries(map).forEach(([key, raw]) => {
    if (ignore.has(key)) return;
    const value = fmt(raw);
    if (!value) return;
   push(`${labelize(key)}: ${value}`, key); // carry the key as pdKey
  });
  return { key: "personal details", title: sectionTitle, records: pd };
}

// ---------- Color resolver helpers (paste above toCircularProps) ----------
const hexToRgb = (h: string) => {
  const m = h.replace("#", "").match(/^([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};
const rgbToHex = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");

const mix = (aHex: string, bHex: string, t = 0.5) => {
  const a = hexToRgb(aHex), b = hexToRgb(bHex);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
};
// positive shade => lighten, negative => darken
const shade = (hex: string, amount = 0) => {
  const t = amount / 100;
  const { r, g, b } = hexToRgb(hex);
  const L = (v: number) => v + (255 - v) * t;
  const D = (v: number) => v * (1 - (-t));
  return rgbToHex(t >= 0 ? L(r) : D(r), t >= 0 ? L(g) : D(g), t >= 0 ? L(b) : D(b));
};

const colorVal = (nameOrHex: any, base: any): string | undefined => {
  if (typeof nameOrHex === "string" && nameOrHex.startsWith("#")) return nameOrHex;
  if (typeof nameOrHex === "string") return base?.[nameOrHex]; // e.g. "primary" -> tpl.colors.primary
  return undefined;
};

/** Resolve a derivableColors entry into a final hex string */
function resolveDerivable(key: string, tpl: any): string | undefined {
  const base = tpl?.colors ?? {};
  const spec = tpl?.derivableColors?.[key];
  if (!spec) return undefined;

  if (typeof spec === "string") return spec; // already a hex
  if (typeof spec !== "object") return undefined;

  switch (spec.type) {
    case "copy": {
      return colorVal(spec.color, base);
    }
    case "mix": {
      const a = colorVal(spec.originColor, base);
      const b = colorVal(spec.mixColor, base);
      const t = typeof spec.intensity === "number" ? spec.intensity : 0.5;
      if (a && b) return mix(a, b, t);
      return undefined;
    }
    case "copyWithShade": {
      const c = colorVal(spec.color, base);
      if (c) return shade(c, spec.shade ?? 0);
      return undefined;
    }
    // Some templates typo "constrast" (contrast). Make a readable fallback:
    case "constrast":
    case "contrast": {
      // Pick between defaultColor / fallbackColor based on contrast threshold.
      // Keep it simple: if base color looks dark, use defaultColor, else fallbackColor.
      const bg = colorVal(spec.color, base) ?? "#ffffff";
      const { r, g, b } = hexToRgb(bg);
      const luminance = 0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255);
      const prefer = luminance < 0.5 ? (spec.defaultColor ?? "#ffffff") : (spec.fallbackColor ?? "#000000");
      return prefer;
    }
    default:
      return undefined;
  }
}


/** MAIN ADAPTER */
export function toCircularProps(templateData: any, templateOptions?: any): CircularProps {
  // name
  const { first, last } = splitName(templateData.title);

  // split sections into rail/main
  const railKeys = new Set(["personal details", "skills", "languages", "hobbies", "qualities"]);

  const mapped = (templateData.sections || []).map(mapEditorSection);

  // ensure PD is present in rail, constructed from fields on the templateData
  const railSections: Section[] = [buildPersonalDetailsSection(templateData)];
  for (const s of mapped) {
    if (railKeys.has(s.key)) railSections.push(s);
  }

  const mainSections: Section[] = [];
  for (const s of mapped) {
    if (!railKeys.has(s.key)) mainSections.push(s);
  }

  // profile first (if exists) — optional
  const profIdx = mainSections.findIndex(s => s.key === "profile");
  if (profIdx > 0) {
    const [prof] = mainSections.splice(profIdx, 1);
    mainSections.unshift(prof);
  }

  // theme → renderer (resolve derivable objects to strings)
  const primary = templateOptions?.colors?.primary ?? "#395a86";
  const railBg =
    resolveDerivable("leftColumnBackgroundColor", templateOptions) ??
    templateOptions?.colors?.backgroundColor ??
    "#f5f7f9";

  const headerText =
    resolveDerivable("headerTextColor", templateOptions) ??
    "#333333";

  const colors = {
    primary,
    railBg,
    text: templateOptions?.colors?.textColor ?? "black",
    header: headerText,
    divider: "#d8d8d8",
  };

  const sizes = {
    body: templateOptions?.fontSizes?.text ?? 10,
    heading: 15,
    section: templateOptions?.fontSizes?.sectionHeader ?? 18,
    line: Math.round((templateOptions?.fontSizes?.text ?? 10) * (templateOptions?.lineHeightFactor ?? 1.25) * 1.5),
    paraGap: 8,
    headerGap: 4,
    titleGap: 12,
    sectionGap: 18,
    recordGap: 6,
    beforeTitlePad: 6,
  };

  return {
    firstName: first,
    lastName: last,
    headline: templateData.headline || "",
    photoUrl: templateData.photo?.url || templateData.photoUrl || undefined,
    railSections,
    mainSections,
    colors,
    fontFamily: templateOptions?.fontName || "LiberationSans, Arial, sans-serif",
    sizes,
  };
}
