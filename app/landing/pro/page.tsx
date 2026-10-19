// app/landing/pro/page.tsx
//
// Paid-traffic landing page that mirrors the card-billing (CC) page template:
// black page, Phudu display headings + Inter body, logo → headline → one price
// line → Apple Pay / Google Pay → two consent lines, then the same long-form
// section order (what / categories / features / values / milestones / how to
// subscribe / pricing / how to unsubscribe / footer). Noindex like the other
// /landing/* variants.
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import ProClient from './ProClient';

// Variable fonts bundled locally (downloaded from Google Fonts, latin subset)
// so the build never depends on fonts.googleapis.com.
const phudu = localFont({ src: './fonts/phudu-latin.woff2', weight: '300 900', variable: '--font-phudu', display: 'swap' });
const inter = localFont({ src: './fonts/inter-latin.woff2', weight: '100 900', variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'ResumeMint – Your AI Resume Builder That Beats the ATS',
  description:
    'AI-tailored resumes and cover letters that pass applicant tracking systems. Start your free trial with Apple Pay or Google Pay.',
  alternates: { canonical: '/landing/pro' },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: {
    url: '/landing/pro',
    title: 'ResumeMint – Your AI Resume Builder That Beats the ATS',
    description: 'AI-tailored resumes and cover letters that pass applicant tracking systems.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResumeMint – Your AI Resume Builder That Beats the ATS',
    description: 'AI-tailored resumes and cover letters that pass applicant tracking systems.',
  },
};

export default function Page() {
  return (
    <div className={`${phudu.variable} ${inter.variable}`}>
      <ProClient />
    </div>
  );
}
