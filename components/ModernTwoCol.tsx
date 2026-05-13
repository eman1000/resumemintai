'use client';
import type { Resume } from '@/types/resume';

export default function ModernTwoCol({ data, accent = '#f43f5e' }: { data: Resume; accent?: string }) {
  const c = data.contact || {};
  return (
    <div className="bg-white text-[#1d1d20] rounded-2xl p-8 print:rounded-none print:p-6"
         style={{ fontFamily: 'Inter, ui-sans-serif', fontSize: 11 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight">{data.name || 'Your Name'}</h1>
        <div className="text-[11px] text-right">{[c.email, c.phone, c.website, c.location].filter(Boolean).join(' • ')}</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-6">
        {/* Left column */}
        <aside className="col-span-1">
          {data.summary && (
            <section className="mb-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#52525a]">Profile</h3>
              <p className="mt-1 leading-[1.45]">{data.summary}</p>
            </section>
          )}

          <section className="mb-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#52525a]">Skills</h3>
            <div className="mt-1">
              <p><span className="font-semibold">Core:</span> {data.skills.core.join(', ')}</p>
              <p><span className="font-semibold">Tools:</span> {data.skills.tools.join(', ')}</p>
              <p><span className="font-semibold">Soft:</span> {data.skills.soft.join(', ')}</p>
            </div>
          </section>

          {!!data.education?.length && (
            <section className="mb-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#52525a]">Education</h3>
              <div className="mt-1 space-y-2">
                {data.education.map((ed, i) => (
                  <div key={i}>
                    <p className="text-[12px] font-semibold">{ed.degree}</p>
                    <p className="text-[11px]">{ed.school}{ed.dates ? ` • ${ed.dates}` : ''}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Right column */}
        <main className="col-span-2">
          <section>
            <div className="h-1 w-16 rounded-full mb-2" style={{ background: accent, opacity: .25 }} />
            <h3 className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#52525a]">Experience</h3>
            <div className="mt-1 space-y-3">
              {data.experience.map((e, i) => (
                <div key={i}>
                  <p className="text-[12px] font-semibold">
                    {e.role}{e.company ? ` — ${e.company}` : ''}{e.location ? ` · ${e.location}` : ''}{(e.start || e.end) ? ` | ${e.start || ''}${e.end ? ` – ${e.end}` : ''}` : ''}
                  </p>
                  <ul className="list-disc pl-5 leading-[1.45]">
                    {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
