import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'ATS-Friendly Resume Templates',
  description:
    'Discover 12 ATS-friendly resume templates — Classic, Modern, Elegant, Creative, Executive, and more. Easily switch designs without losing content.',
  alternates: { canonical: '/templates' },
  openGraph: {
    url: '/templates',
    title: 'Explore ATS-Compatible Resume Templates | ResumeMint',
    description: 'Choose from 12 ATS-friendly resume templates and switch anytime without losing content.',
    images: [{ url: '/api/og?eyebrow=TEMPLATES&title=12+ATS-friendly+resume+templates', width: 1200, height: 630 }],
  },
};

const templates = [
  { name: 'Circular', renderer: 'circular', desc: 'Two-column layout with a stylish sidebar for skills and contact info.' },
  { name: 'Elegant', renderer: 'elegant', desc: 'Sophisticated design with a deep emerald sidebar and accent colors.' },
  { name: 'Classic', renderer: 'classic', desc: 'Single-column ATS-friendly layout, clean and traditional.' },
  { name: 'Modern', renderer: 'modern', desc: 'Subtle color accents with timeline-style work experience.' },
  { name: 'Minimal', renderer: 'minimal', desc: 'Maximum whitespace with thin dividers for a clean look.' },
  { name: 'Creative', renderer: 'creative', desc: 'Bold header with asymmetric two-column layout.' },
  { name: 'Executive', renderer: 'executive', desc: 'Formal serif-style design for senior professionals.' },
  { name: 'Chrono', renderer: 'chrono', desc: 'Timeline layout with visual date markers and vertical line.' },
  { name: 'Horizontal', renderer: 'horizontal', desc: 'Bold horizontal dividers with skill progress bars.' },
];

const faqs = [
  { q: 'Can I switch templates after creating my resume?', a: 'Yes! You can change templates at any time from the editor. Your content will automatically adapt to the new layout.' },
  { q: 'Are all templates ATS-compatible?', a: 'Yes, all our templates are designed to be parsed correctly by Applicant Tracking Systems. The Classic and Minimal templates are the most ATS-friendly.' },
  { q: 'Can I customize colors and fonts?', a: 'Each template comes with carefully chosen color schemes and typography. You can focus on your content while the template handles the design.' },
];

export default function TemplatesPage() {
  return (
    <>
      <SiteNav />

      {/* Hero */}
      <div className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1d1d20]">Resume Templates</h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            Choose from 12 professionally designed templates. Each one is ATS-compatible and optimized for readability.
          </p>
        </div>
      </div>

      {/* Template Grid */}
      <section className="bg-[#f8fbfc]">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {templates.map((t) => (
              <Link
                key={t.renderer}
                href="/builder"
                className="group block"
              >
                <div className="relative rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-brand/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/template-previews/resume/${t.renderer}.png`}
                    alt={`${t.name} resume template preview`}
                    loading="lazy"
                    className="block w-full h-auto"
                  />
                  <div className="absolute inset-0 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-brand/80 via-transparent to-transparent">
                    <span className="bg-white text-brand text-sm font-semibold px-4 py-2 rounded-full shadow-md">
                      Use this template →
                    </span>
                  </div>
                </div>
                <div className="mt-3 px-1">
                  <h3 className="font-semibold text-[#1d1d20] group-hover:text-brand transition-colors">{t.name}</h3>
                  <p className="text-sm text-[#52525a] mt-0.5">{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-[#1d1d20] mb-10">Frequently asked questions</h2>
          <div className="max-w-2xl mx-auto divide-y divide-gray-200">
            {faqs.map((faq, i) => (
              <details key={i} className="group py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-[#1d1d20]">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-[#a1a1aa] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-[#52525a] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-50">
        <div className="max-w-site mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-[#1d1d20]">Ready to create your resume?</h2>
          <Link href="/builder" className="btn-primary mt-4 inline-flex">
            Get started
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
