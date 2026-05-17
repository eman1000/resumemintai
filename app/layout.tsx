// app/layout.tsx
import './globals.scss';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Hotjar from '@/components/Hotjar';
import TrackPageView from '@/components/TrackPageView';

const brandFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-brand',
  display: 'swap',
});

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.resumemintai.com'
).replace(/\/$/, '');

// Defaults that cascade to every page. Per-page metadata overrides title,
// description, OG image, etc. %s in the title template gets the page title.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ResumeMint — AI Resume Builder that beats ATS',
    template: '%s · ResumeMint',
  },
  description:
    'ResumeMint tailors your resume to any job with AI. ATS-friendly templates, AI cover letters, one-click apply on supported boards.',
  applicationName: 'ResumeMint',
  authors: [{ name: 'ResumeMint' }],
  creator: 'ResumeMint',
  publisher: 'ResumeMint',
  keywords: [
    'AI resume builder',
    'ATS resume',
    'cover letter generator',
    'resume tailoring',
    'CV builder',
    'job application',
    'resume templates',
    'one-click apply',
  ],
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'ResumeMint',
    locale: 'en_US',
    url: SITE_URL,
    title: 'ResumeMint — AI Resume Builder that beats ATS',
    description:
      'Tailor your resume to any job with AI. ATS-friendly templates, AI cover letters, one-click apply on supported boards.',
    images: [
      { url: '/api/og', width: 1200, height: 630, alt: 'ResumeMint — AI Resume Builder' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResumeMint — AI Resume Builder that beats ATS',
    description:
      'Tailor your resume to any job with AI. ATS-friendly templates, AI cover letters, one-click apply.',
    images: ['/api/og'],
  },
  icons: {
    icon: [{ url: '/logo/resumemint-icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/logo/resumemint-icon.svg'],
    apple: [{ url: '/logo/resumemint-icon.svg' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={brandFont.variable}>
      <head>
        <Script
            src={`https://www.googletagmanager.com/gtag/js?id=G-G1TL8Q135F`}
            strategy="afterInteractive"
          />

       {/* Google Ads / GA4 (direct gtag) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17589141195"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17589141195'); // Google Ads
            gtag('config', 'G-G1TL8Q135F');   // GA4 (optional)
          `}
        </Script>
      </head>
      <body>

        <TrackPageView />
        <Hotjar />
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
