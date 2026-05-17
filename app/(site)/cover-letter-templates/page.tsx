import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'AI-Enhanced Cover Letter Templates',
  description:
    'Discover AI-tailored cover letter templates that match your resume — Professional, Classic, Elegant, and Creative designs for any job application.',
  alternates: { canonical: '/cover-letter-templates' },
  openGraph: {
    url: '/cover-letter-templates',
    title: 'AI-Enhanced Cover Letter Templates | ResumeMint',
    description: 'AI-designed cover letter templates that complement your resume.',
    images: [{ url: '/api/og?eyebrow=COVER+LETTERS&title=Cover+letter+templates+that+match+your+resume', width: 1200, height: 630 }],
  },
};

const templates = [
  { name: 'Professional', renderer: 'professional', desc: 'Clean, structured layout perfect for corporate applications.' },
  { name: 'Classic', renderer: 'classic', desc: 'Traditional business letter format with serif type.' },
  { name: 'Elegant', renderer: 'elegant', desc: 'Two-column sidebar with contact strip and accent colors.' },
  { name: 'Creative', renderer: 'creative', desc: 'Bold colour header with tag chips for skills.' },
];

const faqs = [
  { q: 'How long should a cover letter be?', a: 'A cover letter should typically be one page (3-4 paragraphs). Keep it concise and focused on why you are the right fit for the role.' },
  { q: 'Should I match my cover letter to my resume template?', a: 'Yes! Using the same template for both creates a consistent, professional application package.' },
  { q: 'Can I use AI to help write my cover letter?', a: 'Yes, our AI assistant can help generate compelling paragraphs based on the job description and your experience.' },
];

export default function CoverLetterTemplatesPage() {
  return (
    <>
      <SiteNav />

      <div className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1d1d20]">Cover Letter Templates</h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            Write compelling cover letters with professionally designed templates that match your resume.
          </p>
        </div>
      </div>

      <section className="bg-[#f8fbfc]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {templates.map((t) => (
              <Link
                key={t.renderer}
                href="/login?return=/builder/cover-letters"
                className="group block"
              >
                <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-brand/40">
                  <div className="relative bg-gray-100" style={{ aspectRatio: '210 / 297' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/template-previews/cover-letter/${t.renderer}.png`}
                      alt={`${t.name} cover letter template preview`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-black/0 group-hover:from-brand/80 group-hover:via-brand/0 group-hover:to-transparent transition-colors duration-200 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                      <span className="bg-white text-brand text-sm font-semibold px-4 py-2 rounded-full shadow-md">
                        Use this template →
                      </span>
                    </div>
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

      <section className="bg-brand-50">
        <div className="max-w-site mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-[#1d1d20]">Ready to write your cover letter?</h2>
          <Link href="/login?return=/builder/cover-letters" className="btn-primary mt-4 inline-flex">
            Get started
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
