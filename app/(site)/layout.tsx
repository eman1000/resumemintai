import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import '../globals.scss';

export const metadata: Metadata = {
  title: 'AI Resume Builder — Land your next role',
  description: 'Tailor your resume to any job with AI. ATS-friendly, quantified, fast.',
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
