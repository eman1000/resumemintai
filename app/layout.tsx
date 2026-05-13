// app/layout.tsx
import './globals.scss';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';
import Hotjar from '@/components/Hotjar';
import TrackPageView from '@/components/TrackPageView';

export const metadata: Metadata = {
  title: 'AI Resume Builder',
  description: 'Tailor your resume to any job with AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
