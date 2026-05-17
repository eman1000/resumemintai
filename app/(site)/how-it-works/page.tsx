import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'Create Tailored Resumes with AI in 3 Easy Steps',
  description:
    'Discover how ResumeMint AI crafts your perfect resume: paste your work history, drop in a job description, and export a polished, ATS-friendly PDF.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    url: '/how-it-works',
    title: 'Effortless AI-Powered Resume Creation in 3 Steps',
    description: 'Create a tailored resume effortlessly with ResumeMint AI in three steps.',
    images: [
      { url: '/api/og?eyebrow=HOW+IT+WORKS&title=Tailor+your+resume+in+three+steps', width: 1200, height: 630 },
    ],
  },
};

export default function Page() {
  return (
    <PageShell title="How ResumeMint works" subtitle="Create tailored resumes with AI in 3 easy steps.">
      <div className="max-w-3xl mx-auto text-[#1d1d20] leading-relaxed">
        <p className="text-lg">
          Navigating the job application process can feel overwhelming, but ResumeMint AI simplifies
          it into three straightforward steps. Here&apos;s how you craft the perfect resume — effortlessly.
        </p>

        <h2 className="text-2xl font-bold mt-10 mb-3">Step 1 — Paste your resume or work history</h2>
        <p>
          Supply us with your existing resume or your work history. This is where the magic of our
          AI resume builder begins: by analyzing your input, ResumeMint AI identifies key skills and
          experiences to highlight.
        </p>
        <p className="mt-3">
          No existing resume? List your job titles, dates, and key responsibilities — let our AI do
          the heavy lifting.
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-1.5">
          <li><strong>Quick upload:</strong> copy and paste your information.</li>
          <li><strong>Smart analysis:</strong> our AI pinpoints what matters most.</li>
          <li><strong>No resume? No problem:</strong> enter work history details manually.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10 mb-3">Step 2 — Paste the target job description</h2>
        <p>
          With your work history ready, paste the job description for the role you&apos;re aiming for.
          This is where our AI resume builder really shines: it aligns your resume with the specific
          requirements and keywords employers are looking for. Tailoring your resume to the job
          description increases your chances of landing an interview.
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-1.5">
          <li><strong>Targeted matching:</strong> aligns your resume with job-specific keywords.</li>
          <li><strong>Detailed highlighting:</strong> identifies and emphasizes relevant skills.</li>
          <li><strong>Higher interview chances:</strong> a perfectly tailored resume stands out.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-10 mb-3">Step 3 — Review, switch template, and export to PDF</h2>
        <p>
          Time to see your resume come to life. ResumeMint offers a variety of{' '}
          <Link href="/templates" className="text-brand underline">resume templates</Link>{' '}
          so you can choose one that best represents your personal brand. Once you&apos;re happy with the
          layout and content, export to a polished PDF — ready to send to potential employers.
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-1.5">
          <li><strong>Diverse templates:</strong> a range of professional designs.</li>
          <li><strong>Editable content:</strong> make changes until it&apos;s just right.</li>
          <li><strong>PDF export:</strong> a professional document in seconds.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-12 mb-3">Why use ResumeMint AI?</h2>

        <h3 className="text-xl font-semibold mt-6 mb-2">Advanced AI resume builder</h3>
        <p>
          Our AI resume builder isn&apos;t just about looks — it&apos;s about delivering a resume that works.
          By focusing on content optimization and keyword integration, ResumeMint ensures your
          skills and experiences are showcased in the best possible light.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-2">Resume templates and cover letters</h3>
        <p>
          Whether you&apos;re applying for your first job or seeking a career change, our resume
          templates and{' '}
          <Link href="/cover-letter-templates" className="text-brand underline">cover letter generator</Link>{' '}
          help you tailor every application with ease and confidence.
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-1.5">
          <li><strong>Professional designs:</strong> stand out with sleek, modern templates.</li>
          <li><strong>Customizable cover letters:</strong> match your resume&apos;s tone and style.</li>
          <li><strong>Comprehensive tools:</strong> everything you need in one place.</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-2">Seamless job application process</h3>
        <p>
          Applying for jobs shouldn&apos;t be a hassle. ResumeMint takes the stress out of the equation
          with a painless, integrated experience — from building your resume to applying for the job.
        </p>

        <div className="mt-10 rounded-lg bg-brand-50 p-6 text-center">
          <h3 className="text-xl font-semibold text-[#1d1d20]">Ready to get started?</h3>
          <p className="mt-2 text-[#52525a]">
            With just a few clicks you can create a tailored, professional resume that catches the
            eye of hiring managers. Your resume is often your first impression — make it count.
          </p>
          <Link href="/builder" className="btn-primary mt-4 inline-flex">
            Start building your resume
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
