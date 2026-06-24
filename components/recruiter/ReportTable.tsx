"use client";

// Inline "FINAL SHORTLIST" table view (the recruiter's format) — mirrors the
// Word/PDF table export. Type-aware columns; our analysis married into Comment.

import { FIT_LABEL } from "@/components/recruiter/fitLabels";

export type TableCandidate = {
  name: string;
  score: number;
  fitCategory?: string | null;
  verdict?: string | null;
  strengths?: string[];
  gaps?: string[];
  email?: string | null;
  phone?: string | null;
  links?: string[];
  age?: number | null;
  gender?: string | null;
  yearsExperience?: number | null;
  qualification?: string | null;
  certifications?: string | null;
  education?: string | null;
  academicResults?: string | null;
  experienceHistory?: { period: string; role: string; company: string }[];
  source?: string | null;
};

export default function ReportTable({ candidates, intern }: { candidates: TableCandidate[]; intern: boolean }) {
  const cell = "border border-gray-300 px-3 py-2 align-top text-xs";
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#0f1b2d] text-white text-left">
            <th className={cell}>#</th>
            <th className={cell}>Candidate Name &amp; Contact</th>
            <th className={cell}>Age</th>
            <th className={cell}>Gender</th>
            <th className={cell}>{intern ? "Program of Study & College" : "Qualifications & Experience"}</th>
            <th className={cell}>Source</th>
            <th className={cell}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              <td className={cell}>{i + 1}</td>
              <td className={cell}>
                <div className="font-semibold text-[#1d1d20]">{c.name}</div>
                {c.phone && <div>📞 {c.phone}</div>}
                {c.email && <div className="break-all">✉ {c.email}</div>}
                {(c.links || []).map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block text-mint-700 break-all">{u}</a>
                ))}
              </td>
              <td className={cell}>{c.age ?? ""}</td>
              <td className={cell}>{c.gender || ""}</td>
              <td className={cell}>
                {intern ? (
                  <>
                    {c.education && <div>{c.education}</div>}
                    {c.academicResults && <div className="mt-1"><b>Academic results:</b> {c.academicResults}</div>}
                    {c.qualification && <div className="mt-1">{c.qualification}</div>}
                  </>
                ) : (
                  <>
                    {(c.experienceHistory?.length ?? 0) > 0 && (
                      <>
                        <div className="font-semibold">Experience</div>
                        <ul className="list-disc ms-4 mb-1">
                          {c.experienceHistory!.map((e, j) => (
                            <li key={j}>{[e.period, e.role, e.company].filter(Boolean).join(" – ")}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {c.yearsExperience != null && <div className="italic">Years of Experience: {c.yearsExperience}</div>}
                    {c.qualification && <div className="mt-1"><b>Qualifications</b><br />{c.qualification}</div>}
                    {c.certifications && <div className="mt-1"><b>Professional Training</b><br />{c.certifications}</div>}
                  </>
                )}
              </td>
              <td className={cell}>{c.source || ""}</td>
              <td className={cell}>
                <div className="font-semibold">
                  {c.fitCategory ? `${FIT_LABEL[c.fitCategory] || c.fitCategory} · ` : ""}{c.score}/100
                </div>
                {c.verdict && <div>{c.verdict}</div>}
                {(c.strengths?.length ?? 0) > 0 && <div className="mt-1"><b>Strengths:</b> {c.strengths!.join("; ")}</div>}
                {(c.gaps?.length ?? 0) > 0 && <div className="mt-1"><b>Gaps:</b> {c.gaps!.join("; ")}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
