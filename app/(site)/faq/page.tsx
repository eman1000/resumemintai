import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { faqPageLd, jsonLdScript } from '@/lib/seo-ld';

export const metadata: Metadata = {
  title: 'FAQ — ResumeMint',
  description:
    'Frequently asked questions about ResumeMint — how the AI resume builder works, pricing, ATS optimization, cover letters, refunds, privacy, and support.',
  alternates: { canonical: '/faq' },
  openGraph: {
    url: '/faq',
    title: 'ResumeMint FAQ',
    description: 'Answers to common questions about the ResumeMint AI resume builder.',
    images: [
      { url: '/api/og?eyebrow=FAQ&title=Frequently+asked+questions', width: 1200, height: 630 },
    ],
  },
};

type Faq = { q: string; a: React.ReactNode; aText: string };

const FAQS: Faq[] = [
  {
    q: 'What is ResumeMint?',
    aText:
      'ResumeMint is an AI-powered resume builder designed to create resumes that effectively pass Applicant Tracking Systems (ATS). It helps job-seekers craft professional, customized resumes to improve their chances of landing interviews.',
    a: (
      <>
        ResumeMint is an AI-powered resume builder designed to create resumes that effectively pass
        Applicant Tracking Systems (ATS). It helps job-seekers craft professional, customized resumes
        to improve their chances of landing interviews.
      </>
    ),
  },
  {
    q: 'How does ResumeMint help with ATS?',
    aText:
      'ResumeMint uses AI to analyze job descriptions and optimize your resume with relevant keywords and formatting. This ensures your resume meets the criteria of ATS software and increases the likelihood of it being seen by recruiters.',
    a: (
      <>
        ResumeMint uses AI to analyze job descriptions and optimize your resume with relevant
        keywords and formatting. This ensures your resume meets the criteria of ATS software and
        increases the likelihood of it being seen by recruiters.
      </>
    ),
  },
  {
    q: 'Can I create a cover letter with ResumeMint?',
    aText:
      'Yes. ResumeMint offers a variety of cover letter templates tailored to your job application. Our AI helps you create a compelling cover letter that complements your resume.',
    a: (
      <>
        Yes. ResumeMint offers a variety of{' '}
        <Link href="/cover-letter-templates" className="text-brand underline">
          cover letter templates
        </Link>{' '}
        tailored to your job application. Our AI helps you create a compelling cover letter that
        complements your resume.
      </>
    ),
  },
  {
    q: 'How do I get started with ResumeMint?',
    aText:
      'Visit the How it works page for step-by-step instructions on creating an account, building your resume, and using our features to optimize your applications.',
    a: (
      <>
        Visit the{' '}
        <Link href="/how-it-works" className="text-brand underline">
          How it works
        </Link>{' '}
        page for step-by-step instructions on creating an account, building your resume, and using
        our features to optimize your applications.
      </>
    ),
  },
  {
    q: 'What are the pricing options for using ResumeMint?',
    aText:
      'ResumeMint offers a simple subscription with full access to all AI tools, templates, and cover letters. See the Pricing page for current details and trial information.',
    a: (
      <>
        ResumeMint offers a simple subscription with full access to all AI tools, templates, and
        cover letters. See the{' '}
        <Link href="/pricing" className="text-brand underline">
          Pricing
        </Link>{' '}
        page for current details and trial information.
      </>
    ),
  },
  {
    q: "Is there a refund policy if I'm not satisfied with ResumeMint?",
    aText:
      "Yes. If you're not satisfied with the service, see our Refund Policy page for details on how to request a refund and the conditions that apply.",
    a: (
      <>
        Yes. If you&apos;re not satisfied with the service, see our{' '}
        <Link href="/refund" className="text-brand underline">
          Refund Policy
        </Link>{' '}
        page for details on how to request a refund and the conditions that apply.
      </>
    ),
  },
  {
    q: 'How does ResumeMint ensure my privacy?',
    aText:
      'ResumeMint is committed to protecting your privacy. Our Privacy Policy outlines how we collect, use, and safeguard your personal information. We never share your data with third parties for marketing.',
    a: (
      <>
        ResumeMint is committed to protecting your privacy. Our{' '}
        <Link href="/privacy" className="text-brand underline">
          Privacy Policy
        </Link>{' '}
        outlines how we collect, use, and safeguard your personal information. We never share your
        data with third parties for marketing.
      </>
    ),
  },
  {
    q: 'Can I see reviews from other users?',
    aText:
      'Yes. Visit our Reviews page to read testimonials and feedback from users who have successfully used ResumeMint to advance their careers.',
    a: (
      <>
        Yes. Visit our{' '}
        <Link href="/reviews" className="text-brand underline">
          Reviews
        </Link>{' '}
        page to read testimonials and feedback from users who have successfully used ResumeMint to
        advance their careers.
      </>
    ),
  },
  {
    q: 'What makes ResumeMint different from other resume builders?',
    aText:
      'ResumeMint stands out with its AI-driven approach focused on creating ATS-friendly resumes. The platform optimizes your job applications with tailored templates and intelligent keyword suggestions.',
    a: (
      <>
        ResumeMint stands out with its AI-driven approach focused on creating ATS-friendly resumes.
        The platform optimizes your job applications with tailored templates and intelligent keyword
        suggestions.
      </>
    ),
  },
  {
    q: 'How can I contact ResumeMint for support or inquiries?',
    aText:
      'If you have questions or need assistance, visit our Contact page and use the contact form. Our support team typically responds within one business day.',
    a: (
      <>
        If you have questions or need assistance, visit our{' '}
        <Link href="/contact" className="text-brand underline">
          Contact
        </Link>{' '}
        page and use the contact form. Our support team typically responds within one business day.
      </>
    ),
  },
];

export default function FAQPage() {
  const ldFaqs = FAQS.map((f) => ({ q: f.q, a: f.aText }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqPageLd(ldFaqs))}
      />
      <SiteNav />

      <header className="bg-white">
        <div className="max-w-site mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1d1d20]">Frequently asked questions</h1>
          <p className="mt-4 text-[#52525a] text-lg max-w-2xl mx-auto">
            Quick answers about ResumeMint — how the AI works, pricing, privacy, refunds, and support.
          </p>
        </div>
      </header>

      <section className="bg-[#f8fbfc]">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
            {FAQS.map((faq, i) => (
              <details key={i} className="group p-5">
                <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-[#1d1d20]">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-[#a1a1aa] group-open:rotate-180 transition-transform flex-shrink-0 ml-3" />
                </summary>
                <div className="mt-3 text-sm text-[#52525a] leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-[#52525a]">Still have a question?</p>
            <Link href="/contact" className="btn-primary mt-3 inline-flex">
              Contact support
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
