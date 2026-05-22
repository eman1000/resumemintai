// app/api/extension/resume/route.ts
//
// Returns the user's most-recently-updated resume in a FLAT shape ready for
// the extension's fillers. Internally the resume is stored as the editor's
// section-based JSON; we flatten it here so the extension doesn't have to.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FlatResume = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  city: string;
  country: string;
  website: string;
  linkedIn: string;
  github: string;
  headline: string;
  summary: string;
  experience: Array<{
    role: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    startDate: string;
    endDate: string;
  }>;
  skills: string[];
  languages: Array<{ name: string; level: string }>;
};

function splitName(full: string): { first: string; last: string } {
  const t = String(full || "").trim();
  if (!t) return { first: "", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function stripHtml(s: string | undefined): string {
  return String(s || "")
    .replace(/<\/?(p|br|div|li|ul|ol)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function bulletsFromHtml(html: string | undefined): string[] {
  if (!html) return [];
  const out: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(stripHtml(m[1]));
  }
  if (out.length) return out;
  // No <li>? Treat each non-empty line as a bullet.
  return stripHtml(html)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function flattenResume(row: { data: any; title?: string | null }): FlatResume {
  const td = row.data || {};

  const sections: any[] = Array.isArray(td.sections) ? td.sections : [];
  const sec = (key: string) => sections.find((s) => String(s.key || "").toLowerCase() === key);

  // Personal details live inside the personalDetails section's first record's
  // `values` map (keyed by field name: givenName, familyName, email, phone,
  // address, city, postalCode, website, linkedin, desiredJobPosition, …).
  const pdSec = sec("personaldetails");
  const pdValues: Record<string, any> = pdSec?.records?.[0]?.values || {};

  // Older / alternate shapes leaked these to the top level — keep them as
  // fallbacks so we don't regress for resumes saved before this fix.
  const topLevel = td as Record<string, any>;
  const pdAlt = (td.personalDetails && typeof td.personalDetails === "object")
    ? td.personalDetails
    : {};

  const pickPd = (k: string): string =>
    String(pdValues[k] || pdAlt[k] || topLevel[k] || "").trim();

  const fullName =
    [pickPd("givenName"), pickPd("familyName")].filter(Boolean).join(" ").trim() ||
    String(td.title || td.fullName || "").trim();
  const { first, last } = splitName(fullName);

  const profile = sec("profile");
  const profileRecord = profile?.records?.[0] || {};
  // `values` can be array (indexed by field position) or object map; try both.
  const profileValues = profileRecord.values || {};
  const profileFields = profile?.fields || [];
  const headerIdx = profileFields.findIndex((f: any) => (f?.role || f?.key) === "header");
  const richTextIdx = profileFields.findIndex(
    (f: any) => (f?.role || f?.key) === "richtextValue" || (f?.role || f?.key) === "richtext",
  );
  const profileHeadline =
    (Array.isArray(profileValues) ? profileValues[headerIdx] : profileValues.header) ||
    profileRecord.fields?.header ||
    "";
  const profileSummaryHtml =
    (Array.isArray(profileValues) ? profileValues[richTextIdx] : profileValues.richtextValue) ||
    profileRecord.fields?.richtextValue ||
    "";
  const summary = stripHtml(profileSummaryHtml);

  // Each section stores its records as either `fields: { header, … }` or
  // `values: { header, … }`. Use whichever is present.
  const recordMap = (r: any): Record<string, any> => r?.fields || r?.values || {};

  const employment = sec("employment");
  const experience = (employment?.records || []).map((r: any) => {
    const f = recordMap(r);
    const period = String(f.period || "");
    const [startDate = "", endDate = ""] = period.split(/\s*[-–—]\s*|\s*to\s*/i);
    return {
      role: f.header || "",
      company: f.subheader || "",
      location: f.city || "",
      startDate,
      endDate,
      bullets: bulletsFromHtml(f.richtextValue),
    };
  });

  const educationSec = sec("educations") || sec("education");
  const education = (educationSec?.records || []).map((r: any) => {
    const f = recordMap(r);
    const period = String(f.period || "");
    const [startDate = "", endDate = ""] = period.split(/\s*[-–—]\s*|\s*to\s*/i);
    return {
      degree: f.header || "",
      school: f.subheader || "",
      startDate,
      endDate,
    };
  });

  const skillsSec = sec("skills");
  const skills = (skillsSec?.records || [])
    .map((r: any) => recordMap(r).header || "")
    .filter(Boolean);

  const langSec = sec("languages");
  const languages = (langSec?.records || []).map((r: any) => {
    const f = recordMap(r);
    return { name: f.header || "", level: f.level || "" };
  }).filter((l: any) => l.name);

  // Address can be a string (from personalDetails.address) OR a top-level
  // array of [address, city, postalCode] (from older render-time data).
  const addrStr = pickPd("address");
  const cityStr = pickPd("city");
  const postalStr = pickPd("postalCode");
  const topAddr = Array.isArray(td.address) ? td.address.filter(Boolean).join(", ") : "";
  const location =
    [addrStr, cityStr, postalStr].filter(Boolean).join(", ") || topAddr || "";

  return {
    fullName,
    firstName: pickPd("givenName") || first,
    lastName: pickPd("familyName") || last,
    email: pickPd("email"),
    phone: pickPd("phone"),
    location,
    city: cityStr,
    country: pickPd("country"),
    website: pickPd("website"),
    linkedIn: pickPd("linkedin") || pickPd("linkedIn"),
    github: pickPd("github"),
    headline: String(profileHeadline || "").trim() || pickPd("desiredJobPosition") || pickPd("headline"),
    summary,
    experience,
    education,
    skills,
    languages,
  };
}

export async function GET(req: Request) {
  try {
    const userId = userIdFromExtensionRequest(req);
    const row = await prisma.resume.findFirst({
      where: { userId, archived: false },
      orderBy: [{ updatedAt: "desc" }],
      select: { data: true, title: true },
    });
    if (!row) {
      return NextResponse.json(
        { error: "no_resume", detail: "Create a resume on resumemintai.com first." },
        { status: 404 },
      );
    }
    const flat = flattenResume(row);
    // Fallback: when the resume left email blank, use the ResumeMint
    // account email so the agent still has something to fill.
    if (!flat.email) {
      try {
        const account = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (account?.email) flat.email = account.email;
      } catch {
        // Non-fatal — still return the resume.
      }
    }
    return NextResponse.json(flat);
  } catch (e: any) {
    if (e?.code === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[GET /api/extension/resume]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
