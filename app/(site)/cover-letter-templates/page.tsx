import Link from 'next/link';
import { PenLine, ChevronDown } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

const templates = [
  { name: 'Professional', renderer: 'professional', desc: 'Clean, structured layout perfect for corporate applications.' },
  { name: 'Circular', renderer: 'circular', desc: 'Modern design with a sidebar for your contact details.' },
  { name: 'Elegant', renderer: 'elegant', desc: 'Sophisticated style with accent colors and refined typography.' },
  { name: 'Classic', renderer: 'classic', desc: 'Traditional layout that focuses on your words and professionalism.' },
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
        <div className="max-w-site mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((t) => (
              <div key={t.renderer} className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center">
                  <div className="text-center text-[#a1a1aa]">
                    <PenLine className="w-12 h-12 mx-auto mb-2" />
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#1d1d20] group-hover:text-brand transition-colors">{t.name}</h3>
                  <p className="text-sm text-[#52525a] mt-1">{t.desc}</p>
                  <Link
                    href="/login?return=/builder/cover-letters"
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
