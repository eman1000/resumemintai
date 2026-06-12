// lib/applicantProfile.ts
//
// The persistent "applicant profile": answers to the screening questions that
// repeat across nearly every job application. Collected once (onboarding /
// as-you-go) and injected into the Apply agent so it stops re-asking.
//
// Stored as JSON on User.applicantProfile:
//   { fields: { <knownKey>: string }, custom: { <normQuestion>: string },
//     updatedAt: ISO }

export type KnownField = {
  key: string;
  label: string;
  /** "text" | "yesno" — hint for the onboarding UI. */
  type: "text" | "yesno";
  placeholder?: string;
};

/** The canonical screening questions we proactively collect. */
export const PROFILE_FIELDS: KnownField[] = [
  { key: "workLocation", label: "Current work location (city, country)", type: "text", placeholder: "Kuala Lumpur, Malaysia" },
  { key: "citizenship", label: "Country of citizenship", type: "text", placeholder: "Zimbabwe" },
  { key: "secondCitizenship", label: "Second citizenship (or 'None')", type: "text", placeholder: "None" },
  { key: "workAuthorization", label: "Where are you authorized to work?", type: "text", placeholder: "Malaysia (work permit)" },
  { key: "visaSponsorship", label: "Do you require visa sponsorship?", type: "yesno" },
  { key: "willingToRelocate", label: "Willing to relocate?", type: "yesno" },
  { key: "salaryExpectation", label: "Salary expectation", type: "text", placeholder: "USD 90k–110k / yr" },
  { key: "noticePeriod", label: "Notice period", type: "text", placeholder: "1 month" },
  { key: "earliestStart", label: "Earliest start date", type: "text", placeholder: "Immediately / 2 weeks" },
  { key: "yearsExperience", label: "Total years of experience", type: "text", placeholder: "8" },
  { key: "howHeard", label: "How did you hear about roles? (default source)", type: "text", placeholder: "LinkedIn" },
  { key: "pronouns", label: "Gender / pronouns (optional, for EEO)", type: "text", placeholder: "He/Him" },
  { key: "veteranStatus", label: "Veteran status (optional, EEO)", type: "text", placeholder: "Not a veteran" },
  { key: "disabilityStatus", label: "Disability status (optional, EEO)", type: "text", placeholder: "Prefer not to say" },
];

export type ApplicantProfile = {
  fields: Record<string, string>;
  custom: Record<string, string>;
  updatedAt?: string;
};

export function emptyProfile(): ApplicantProfile {
  return { fields: {}, custom: {} };
}

export function normalizeProfile(raw: any): ApplicantProfile {
  if (!raw || typeof raw !== "object") return emptyProfile();
  return {
    fields: raw.fields && typeof raw.fields === "object" ? raw.fields : {},
    custom: raw.custom && typeof raw.custom === "object" ? raw.custom : {},
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

/** Normalize a free-text question into a stable-ish key for the custom map. */
export function questionKey(q: string): string {
  return String(q || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Merge new answers into a profile (custom map), returning a new object. */
export function mergeAnswers(
  profile: ApplicantProfile,
  answers: Record<string, string>,
  isoTimestamp: string,
): ApplicantProfile {
  const custom = { ...profile.custom };
  for (const [q, a] of Object.entries(answers || {})) {
    const v = String(a ?? "").trim();
    if (!v) continue;
    custom[questionKey(q)] = v;
  }
  return { ...profile, custom, updatedAt: isoTimestamp };
}

/** Render the profile as a compact block for the agent's system context. */
export function profileForPrompt(profile: ApplicantProfile): string {
  const lines: string[] = [];
  for (const f of PROFILE_FIELDS) {
    const v = profile.fields?.[f.key];
    if (v && String(v).trim()) lines.push(`- ${f.label}: ${v}`);
  }
  for (const [q, a] of Object.entries(profile.custom || {})) {
    if (a && String(a).trim()) lines.push(`- ${q}: ${a}`);
  }
  if (!lines.length) return "";
  return (
    "KNOWN APPLICANT PROFILE (use these saved answers; only ask_user for what is genuinely missing or job-specific):\n" +
    lines.join("\n")
  );
}
