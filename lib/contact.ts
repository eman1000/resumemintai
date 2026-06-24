// lib/contact.ts
// Deterministic extraction of contact details from resume plain text. We use
// regex (not the LLM) for email/phone/links so a recruiter never gets a
// hallucinated phone number — only what's literally in the resume.

export type ExtractedContact = {
  email: string | null;
  phone: string | null;
  links: string[]; // portfolio / social / website URLs
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

// Phone: optional +, then 7–15 digits possibly separated by spaces/dashes/dots/parens.
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/g;

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s)>\]]+|[a-z0-9-]+\.(?:com|io|dev|me|co|net|org|app|xyz|tech|design|portfolio)[^\s)>\]]*)/gi;

// Domains we never want to surface as "links".
const LINK_BLOCK = /(?:gmail|yahoo|hotmail|outlook|icloud|proton|example|w3\.org|schema\.org)\./i;

function cleanPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const justDigits = digits.replace(/\D/g, "");
  if (justDigits.length < 7 || justDigits.length > 15) return null;
  return digits;
}

export function extractContact(text: string): ExtractedContact {
  const t = text || "";

  let email = (t.match(EMAIL_RE)?.[0] || "").toLowerCase() || null;
  // pdf-parse often strips spaces, gluing a phone onto the email
  // ("+60166500924emanzoelife@gmail.com"). Drop a leading +/digit run (7+) from
  // the local part — almost certainly a phone, not part of the address.
  if (email) {
    const at = email.indexOf("@");
    let local = email.slice(0, at);
    const domain = email.slice(at);
    local = local.replace(/^\+?\d{7,}/, "");
    email = local ? local + domain : email;
  }

  let phone: string | null = null;
  const phoneMatches = t.match(PHONE_RE) || [];
  for (const m of phoneMatches) {
    // Skip matches that are actually years/dates (e.g. "2018 - 2021").
    const cp = cleanPhone(m.trim());
    if (cp) { phone = cp; break; }
  }

  const links: string[] = [];
  const seen = new Set<string>();
  const urlMatches = t.match(URL_RE) || [];
  for (let u of urlMatches) {
    u = u.replace(/[.,;]+$/, "");
    if (LINK_BLOCK.test(u)) continue;
    if (/@/.test(u)) continue; // part of an email
    const normalized = /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^www\./i, "")}`;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(normalized);
    if (links.length >= 6) break;
  }

  return { email, phone, links };
}

/** Classify a link for icon/label purposes. */
export function linkKind(url: string): "linkedin" | "github" | "gitlab" | "behance" | "dribbble" | "portfolio" {
  const u = url.toLowerCase();
  if (u.includes("linkedin.")) return "linkedin";
  if (u.includes("github.")) return "github";
  if (u.includes("gitlab.")) return "gitlab";
  if (u.includes("behance.")) return "behance";
  if (u.includes("dribbble.")) return "dribbble";
  return "portfolio";
}

/** Digits-only phone for tel:/wa.me links (drops +, spaces, etc.). */
export function phoneDigits(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}
