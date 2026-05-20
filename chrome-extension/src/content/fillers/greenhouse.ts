// Greenhouse application forms have predictable field names: first_name,
// last_name, email, phone, etc. The actual question IDs vary by employer
// but the basic identity fields are stable.

import type { FlatResume } from "../../types";
import { findField, setValue, splitName } from "./utils";

export async function fillGreenhouse(resume: FlatResume): Promise<number> {
  let filled = 0;
  const { first, last } = splitName(resume.fullName);
  const tries: Array<[RegExp[], string]> = [
    [[/first\s*name|firstname|given\s*name/i], resume.firstName || first],
    [[/last\s*name|lastname|family\s*name|surname/i], resume.lastName || last],
    [[/^\s*full\s*name|^\s*name\s*$|your\s*name/i], resume.fullName],
    [[/email/i], resume.email],
    [[/phone|mobile|cell/i], resume.phone],
    [[/linkedin/i], resume.linkedIn],
    [[/website|portfolio|personal\s*site|url/i], resume.website],
    [[/github/i], resume.github],
    [[/city/i], resume.city],
    [[/country/i], resume.country],
    [[/location|address/i], resume.location],
  ];

  for (const [matchers, value] of tries) {
    if (!value) continue;
    const el = findField(matchers);
    if (el) {
      setValue(el, value);
      filled += 1;
    }
  }
  return filled;
}
