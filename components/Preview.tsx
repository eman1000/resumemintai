'use client';
import React, { forwardRef } from 'react';
import type { ResumeOutput } from '@/types';

interface Props {
  data: ResumeOutput | null;
  template: 'ats' | 'modern';
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode; }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold tracking-wide uppercase text-[#a1a1aa]">{title}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

export const ResumePreview = forwardRef<HTMLDivElement, Props>(function ResumePreview({ data, template, name, email, phone, location }, ref) {
  if (!data) {
    return <div className="text-[#52525a] text-sm">Your tailored resume will appear here.</div>
  }
  const hdr = (
    <header className={template === 'modern' ? 'text-center' : ''}>
      <h1 className="text-2xl font-bold text-[#1d1d20] print:text-black">{name || 'Your Name'}</h1>
      <p className="text-xs text-[#52525a] print:text-black">{[email, phone, location].filter(Boolean).join(' • ') || 'you@domain.com • +1 555 123 9876 • City, Country'}</p>
    </header>
  );

  const summary = (
    <Section title="Summary">
      <p className="text-sm leading-relaxed text-[#1d1d20] print:text-black">{data.summary}</p>
    </Section>
  );

  const skills = (
    <Section title="Skills">
      <div className="text-sm text-[#1d1d20] print:text-black">
        <p><span className="font-semibold">Core:</span> {data.skills.core.join(', ')}</p>
        <p><span className="font-semibold">Tools:</span> {data.skills.tools.join(', ')}</p>
        <p><span className="font-semibold">Soft:</span> {data.skills.soft.join(', ')}</p>
      </div>
    </Section>
  );

  const exp = (
    <Section title="Experience">
      <div className="space-y-3">
        {data.experience.map((e, i) => (
          <div key={i}>
            <p className="font-semibold text-[#1d1d20] print:text-black">{e.role}{e.company ? ` — ${e.company}` : ''}</p>
            <ul className="list-disc pl-6 text-sm text-[#1d1d20] print:text-black">
              {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );

  const achievements = data.achievements && data.achievements.length ? (
    <Section title="Achievements">
      <ul className="list-disc pl-6 text-sm text-[#1d1d20] print:text-black">
        {data.achievements.map((a, i) => <li key={i}>{a}</li>)}
      </ul>
    </Section>
  ) : null;

  return (
    <div ref={ref} className={`print:bg-white print:text-black ${template === 'ats' ? 'p-6 bg-white text-[#1d1d20] rounded-xl' : 'p-8 bg-white text-[#1d1d20] rounded-2xl shadow-xl'}`}>
      {hdr}
      <div className="mt-4 grid grid-cols-1 gap-6">
        {summary}
        {skills}
        {exp}
        {achievements}
      </div>
    </div>
  );
});
