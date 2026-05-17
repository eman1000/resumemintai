import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'Enhance Your Resume with AI',
  description:
    "Discover ResumeMint's AI-driven features: ATS-friendly resumes, 12 templates, instant cover letters, match scoring, and one-click apply for job success.",
  alternates: { canonical: '/features' },
  openGraph: {
    url: '/features',
    title: 'Enhance Your Resume with AI: ResumeMint Features',
    description: 'AI tailoring, 12 templates, cover letters, match scoring, one-click apply.',
    images: [
      { url: '/api/og?eyebrow=FEATURES&title=Everything+ResumeMint+can+do', width: 1200, height: 630 },
    ],
  },
};

export default function Page() {
  return (
    <PageShell title="Enhance Your Resume with AI" subtitle="ResumeMint features that help you stand out.">
      <div className="max-w-3xl mx-auto text-[#1d1d20] leading-relaxed">
        <p className="text-lg">
          Looking to stand out in the job market? ResumeMint&apos;s AI-driven features give you the edge.
          With our advanced AI resume builder you can create ATS-friendly resumes designed to pass
          Applicant Tracking Systems smoothly. Here&apos;s what makes ResumeMint an essential tool for your
          job application journey.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3">ATS-Friendly Resumes</h2>
        <p>
          One of the main hurdles job seekers face is getting their resume past ATS. Our AI-tailored
          resumes are crafted so your application doesn&apos;t get lost in the digital void. We focus on
          ATS optimization by using the right keywords and formats, so your resume lands on the
          recruiter&apos;s desk.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3">12 Unique Resume Templates</h2>
        <p>
          Not sure how to structure your resume? We&apos;ve got{' '}
          <Link href="/templates" className="text-brand underline">
            12 unique resume templates
          </Link>{' '}
          that cater to various industries and styles. Whether you&apos;re in tech, finance, or a creative
          field, there&apos;s a template that will make your application shine.
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-1.5">
          <li><strong>Professional Templates:</strong> Timeless designs perfect for corporate settings.</li>
          <li><strong>Modern Templates:</strong> Sleek and clean, ideal for tech and startup jobs.</li>
          <li><strong>Creative Templates:</strong> Bold styles for those in the arts and media.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10 mb-3">Instant Cover Letters</h2>
        <p>
          Why spend hours drafting a cover letter from scratch? Our{' '}
          <Link href="/cover-letter-templates" className="text-brand underline">
            one-click cover letter generator
          </Link>{' '}
          lets you create personalized cover letters in seconds. Just input a few details about the
          job and we&apos;ll craft a compelling letter that complements your resume.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3">Resume Optimization and Match Scoring</h2>
        <p>
          Worried about whether your resume is a good fit for the job? Our resume optimization tool
          provides an instant ATS score, showing you how well your resume matches the job description.
          This feature helps you tweak your application to perfection and increases your chances of
          getting noticed.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3">One-Click Apply</h2>
        <p>
          Time is of the essence when you&apos;re job hunting. Our one-click apply feature lets you submit
          your application to supported job boards quickly and efficiently, so you can focus more on
          preparing for interviews and less on administrative work.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3">Print-Perfect PDF Export</h2>
        <p>
          Presentation matters. ResumeMint ensures your resumes are print-perfect PDFs, ready to
          impress whether you&apos;re sending them digitally or handing them over in person. No formatting
          glitches, just professional-looking documents.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3">Why Choose ResumeMint?</h2>
        <ul className="list-disc pl-6 mt-3 space-y-1.5">
          <li><strong>AI-Powered Tools:</strong> Leverage cutting-edge technology for a competitive edge.</li>
          <li><strong>User-Friendly Interface:</strong> Intuitive design that&apos;s easy for anyone to use.</li>
          <li><strong>Comprehensive Features:</strong> Everything from ATS-friendly resumes to cover letters and job applications in one place.</li>
        </ul>

        <div className="mt-10 rounded-lg bg-brand-50 p-6 text-center">
          <h3 className="text-xl font-semibold text-[#1d1d20]">Ready to upgrade your resume?</h3>
          <p className="mt-2 text-[#52525a]">
            Whether you&apos;re just starting your career or you&apos;re a seasoned professional, ResumeMint helps
            you land that dream job faster.
          </p>
          <Link href="/builder" className="btn-primary mt-4 inline-flex">
            Get started — it&apos;s free
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
