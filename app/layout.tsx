import AutoUrlSignin from '@/components/AutoUrlSignin';
import './globals.scss';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import Gtm from '@/components/Gtm';

export const metadata: Metadata = {
  title: 'AI Resume Builder',
  description: 'Tailor your resume to any job with AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en">
      <body>
                {/* GTM */}
        <Gtm />
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <Toaster position="top-center" />
        <AutoUrlSignin />
        {children}
      </body>
    </html>
  );
}
