// Filler registry. Each ATS gets its own implementation when we know the
// field patterns; unknown sites fall through to the generic AI-driven filler.

import type { FlatResume } from "../../types";
import { fillGreenhouse } from "./greenhouse";
import { fillGeneric } from "./generic";

export type AtsId = "greenhouse" | "lever" | "ashby" | "workable" | "workday" | "linkedin" | "indeed";

export function detectAts(url: string, doc: Document): AtsId | null {
  const u = url.toLowerCase();
  const host = location.hostname.toLowerCase();
  if (host.includes("greenhouse.io") || /boards\.greenhouse\.io/.test(u)) return "greenhouse";
  if (host.includes("lever.co")) return "lever";
  if (host.includes("ashbyhq.com")) return "ashby";
  if (host.includes("workable.com")) return "workable";
  if (host.includes("myworkdayjobs.com")) return "workday";
  if (host.includes("linkedin.com") && /\/jobs\//.test(u)) return "linkedin";
  if (host.includes("indeed.com")) return "indeed";
  return null;
}

export async function runFiller({ resume }: { resume: FlatResume }): Promise<number> {
  const ats = detectAts(location.href, document);
  if (ats === "greenhouse") return fillGreenhouse(resume);
  // TODO: implement lever/ashby/workable/workday/linkedin specialised fillers
  return fillGeneric(resume);
}
