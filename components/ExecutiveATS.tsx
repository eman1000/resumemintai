'use client';
import type { Resume } from '@/types/resume';

export default function ExecutiveATS({ data, accent = '#6366f1' }: { data: Resume; accent?: string }) {
  const c = data.contact || {};
  return (
    <div className="bg-white text-neutral-900 rounded-2xl p-8 print:rounded-none print:p-6"
         style={{ fontFamily: 'Inter, ui-sans-serif', fontSize: 11 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">{data.name || 'Your Name'}</h1>
          <p className="text-[11px]">
            {[c.email, c.phone, c.website, c.location].filter(Boolean).join(' • ') || 'you@domain.com • +1 555 123 9876 • example.com • City, Country'}
          </p>
        </div>
        {/* Accent bar */}
        <div className="h-6 w-24 rounded-full" style={{ background: accent, opacity: .15 }} />
      </div>

      {/* Summary */}
      {data.summary && (
        <section className="mt-5">
          <h3 className="text-[12px] font-semibold tracking-[.12em] uppercase text-neutral-500">Summary</h3>
          <p className="mt-1 leading-[1.45]">{data.summary}</p>
        </section>
      )}

      {/* Skills */}
      <section className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <h3 className="text-[12px] font-semibold tracking-[.12em] uppercase text-neutral-500">Core</h3>
          <p className="mt-1">{data.skills.core.join(', ')}</p>
        </div>
        <div>
          <h3 className="text-[12px] font-semibold tracking-[.12em] uppercase text-neutral-500">Tools</h3>
          <p className="mt-1">{data.skills.tools.join(', ')}</p>
        </div>
        <div>
          <h3 className="text-[12px] font-semibold tracking-[.12em] uppercase text-neutral-500">Soft</h3>
          <p className="mt-1">{data.skills.soft.join(', ')}</p>
        </div>
      </section>

      {/* Experience */}
      <section className="mt-5">
        <h3 className="text-[12px] font-semibold tracking-[.12em] uppercase text-neutral-500">Experience</h3>
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

      {/* Education */}
      {data.education?.length ? (
        <section className="mt-5">
          <h3 className="text-[12px] font-semibold tracking-[.12em] uppercase text-neutral-500">Education</h3>
          <div className="mt-1 space-y-2">
            {data.education.map((ed, i) => (
              <div key={i}>
                <p className="text-[12px] font-semibold">{ed.degree}{ed.school ? ` — ${ed.school}` : ''}{ed.dates ? ` | ${ed.dates}` : ''}</p>
                {!!ed.notes?.length && <ul className="list-disc pl-5">{ed.notes.map((n, j) => <li key={j}>{n}</li>)}</ul>}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
