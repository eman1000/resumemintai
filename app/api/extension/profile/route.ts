// app/api/extension/profile/route.ts
//
// The persistent applicant profile (screening answers) for the Apply agent.
//   GET  → { profile, fields }   — current profile + the known-field schema
//   POST → { ok, profile }       — replace fields and/or merge custom answers
//          body: { fields?: {k:v}, answers?: {question:answer} }

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { userIdFromExtensionRequest } from "@/lib/extensionToken";
import {
  PROFILE_FIELDS,
  normalizeProfile,
  mergeAnswers,
  emptyProfile,
} from "@/lib/applicantProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { applicantProfile: true },
  });
  return NextResponse.json({
    profile: normalizeProfile(u?.applicantProfile),
    fields: PROFILE_FIELDS,
  });
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = userIdFromExtensionRequest(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { applicantProfile: true },
  });
  let profile = normalizeProfile(u?.applicantProfile) || emptyProfile();
  const now = new Date().toISOString();

  // Replace known fields wholesale when provided.
  if (body?.fields && typeof body.fields === "object") {
    const allowed = new Set(PROFILE_FIELDS.map((f) => f.key));
    const next: Record<string, string> = { ...profile.fields };
    for (const [k, v] of Object.entries(body.fields)) {
      if (allowed.has(k)) next[k] = String(v ?? "").trim();
    }
    profile = { ...profile, fields: next, updatedAt: now };
  }

  // Merge ad-hoc answers (captured from ask_user) into the custom map.
  if (body?.answers && typeof body.answers === "object") {
    profile = mergeAnswers(profile, body.answers, now);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { applicantProfile: profile as any },
  });

  return NextResponse.json({ ok: true, profile });
}
