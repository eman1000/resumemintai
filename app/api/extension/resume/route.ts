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
  const fullName = td.title || td.fullName || "";
  const { first, last } = splitName(fullName);
  const pd = td.personalDetails || {};

  const sections: any[] = Array.isArray(td.sections) ? td.sections : [];
  const sec = (key: string) => sections.find((s) => String(s.key || "").toLowerCase() === key);

  const profile = sec("profile");
  const summary = stripHtml(profile?.records?.[0]?.fields?.richtextValue);

  const employment = sec("employment");
  const experience = (employment?.records || []).map((r: any) => {
    const f = r.fields || {};
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
    const f = r.fields || {};
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
    .map((r: any) => r.fields?.header || "")
    .filter(Boolean);

  const langSec = sec("languages");
  const languages = (langSec?.records || []).map((r: any) => ({
    name: r.fields?.header || "",
    level: r.fields?.level || "",
  })).filter((l: any) => l.name);

  const addr = Array.isArray(td.address) ? td.address.join(", ") : td.address || "";
  const location = [td.city, addr].filter(Boolean).join(", ") || addr || "";

  return {
    fullName,
    firstName: pd.givenName || first,
    lastName: pd.familyName || last,
    email: td.emailaddress || pd.email || "",
    phone: td.phonenumber || pd.phone || "",
    location,
    city: td.city || pd.city || "",
    country: td.country || pd.country || "",
    website: td.website || pd.website || "",
    linkedIn: td.linkedin || pd.linkedin || "",
    github: pd.github || "",
    headline: td.headline || pd.desiredJobPosition || "",
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
    return NextResponse.json(flattenResume(row));
  } catch (e: any) {
    if (e?.code === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[GET /api/extension/resume]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
