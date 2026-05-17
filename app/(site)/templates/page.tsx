import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ChevronDown } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Resume Templates',
  description:
    '12 ATS-friendly resume templates — Classic, Modern, Elegant, Creative, Executive, and more. Switch any time without losing content.',
  alternates: { canonical: '/templates' },
  openGraph: {
    url: '/templates',
    title: 'ResumeMint Resume Templates',
    description: '12 ATS-friendly resume templates you can switch between any time.',
    images: [{ url: '/api/og?eyebrow=TEMPLATES&title=12+ATS-friendly+resume+templates', width: 1200, height: 630 }],
  },
};

const templates = [
  { name: 'Circular', renderer: 'circular', desc: 'Two-column layout with a stylish sidebar for skills and contact info.' },
  { name: 'Professional', renderer: 'professional', desc: 'Clean banner header with a structured two-column body.' },
  { name: 'Elegant', renderer: 'elegant', desc: 'Sophisticated design with a dark sidebar and accent colors.' },
  { name: 'Classic', renderer: 'classic', desc: 'Single-column ATS-friendly layout, clean and traditional.' },
  { name: 'Modern', renderer: 'modern', desc: 'Subtle color accents with timeline-style work experience.' },
  { name: 'Minimal', renderer: 'minimal', desc: 'Maximum whitespace with thin dividers for a clean look.' },
  { name: 'Creative', renderer: 'creative', desc: 'Bold header with asymmetric two-column layout.' },
  { name: 'Compact', renderer: 'compact', desc: 'Dense layout optimized for fitting more content per page.' },
  { name: 'Executive', renderer: 'executive', desc: 'Formal serif-style design for senior professionals.' },
  { name: 'Chrono', renderer: 'chrono', desc: 'Timeline layout with visual date markers and vertical line.' },
  { name: 'Horizontal', renderer: 'horizontal', desc: 'Bold horizontal dividers with skill progress bars.' },
  { name: 'Casual', renderer: 'casual', desc: 'Friendly design with rounded elements and warm colors.' },
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
        <div className="max-w-site mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((t) => (
              <div key={t.renderer} className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center">
                  <div className="text-center text-[#a1a1aa]">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#1d1d20] group-hover:text-brand transition-colors">{t.name}</h3>
                  <p className="text-sm text-[#52525a] mt-1">{t.desc}</p>
                  <Link
                    href={`/builder`}
                    className="mt-3 inline-block text-sm text-brand font-medium hover:underline"
                  >
                    Use this template →
                  </Link>
                </div>
              </div>
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
