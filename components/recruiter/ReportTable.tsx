"use client";

// Inline "FINAL SHORTLIST" table view (the recruiter's format) — mirrors the
// Word/PDF table export. Type-aware columns; our analysis married into Comment.

import FitChip from "@/components/recruiter/FitChip";

function hostLabel(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}

function scoreRing(s: number) {
  if (s >= 75) return "text-green-700 ring-green-300 bg-green-50";
  if (s >= 50) return "text-amber-700 ring-amber-300 bg-amber-50";
  return "text-gray-600 ring-gray-300 bg-gray-50";
}

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
  resumeUrl?: string | null;
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
  const cell = "border border-gray-300 px-2.5 py-2 align-top text-xs";
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-[1180px] w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col style={{ width: 34 }} />
          <col style={{ width: 188 }} />
          <col style={{ width: 82 }} />
          <col style={{ width: 44 }} />
          <col style={{ width: 62 }} />
          <col style={{ width: intern ? 300 : 360 }} />
          <col style={{ width: 74 }} />
          <col style={{ width: 96 }} />
          <col style={{ width: intern ? 320 : 280 }} />
        </colgroup>
        <thead>
          <tr className="bg-[#0f1b2d] text-white text-left">
            <th className={cell}>#</th>
            <th className={cell}>Candidate Name &amp; Contact</th>
            <th className={cell}>Resume</th>
            <th className={cell}>Age</th>
            <th className={cell}>Gender</th>
            <th className={cell}>{intern ? "Program of Study & College" : "Qualifications & Experience"}</th>
            <th className={cell}>Source</th>
            <th className={`${cell} text-center`}>Score</th>
            <th className={cell}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              <td className={cell}>{i + 1}</td>
              <td className={cell}>
                <div className="font-semibold text-[#1d1d20]">{c.name}</div>
                {c.phone && <div className="text-gray-600">📞 {c.phone}</div>}
                {c.email && <div className="text-gray-600 break-all">✉ {c.email}</div>}
                {(c.links || []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.links!.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                        className="inline-block rounded border border-gray-200 bg-gray-50 text-gray-600 px-1.5 py-0.5 hover:bg-gray-100">
                        🔗 {hostLabel(u)}
                      </a>
                    ))}
                  </div>
                )}
              </td>
              <td className={cell}>
                {c.resumeUrl ? (
                  <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-mint-200 bg-mint-50 text-mint-700 px-2 py-1 font-medium whitespace-nowrap">
                    📄 View
                  </a>
                ) : <span className="text-gray-300">—</span>}
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
                        <div className="font-semibold mb-0.5">Experience</div>
                        <table className="w-full border-collapse mb-1">
                          <tbody>
                            {c.experienceHistory!.map((e, j) => (
                              <tr key={j} className="align-top">
                                <td className="pr-2 py-0.5 text-gray-500 whitespace-nowrap w-px">{e.period}</td>
                                <td className="py-0.5">{[e.role, e.company].filter(Boolean).join(" — ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    {c.yearsExperience != null && <div className="italic">Years of Experience: {c.yearsExperience}</div>}
                    {c.qualification && <div className="mt-1"><b>Qualifications</b><br />{c.qualification}</div>}
                    {c.certifications && <div className="mt-1"><b>Professional Training</b><br />{c.certifications}</div>}
                  </>
                )}
              </td>
              <td className={cell}>{c.source || ""}</td>
              <td className={`${cell} text-center`}>
                <div className={`mx-auto w-14 h-14 rounded-full ring-2 grid place-items-center leading-none ${scoreRing(c.score)}`}>
                  <span className="text-xl font-extrabold">{c.score}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">/ 100</div>
                {c.fitCategory && <div className="mt-1 flex justify-center"><FitChip category={c.fitCategory} /></div>}
              </td>
              <td className={cell}>
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
