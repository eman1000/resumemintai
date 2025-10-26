// components/Gtm.tsx  (unchanged)
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@/app/builder/hooks/use-query';

declare global { interface Window { dataLayer: any[] } }

export default function Gtm() {
  const pathname = usePathname();
  const searchParams = useQuery();
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID!;

  // Load GTM once
  useEffect(() => {
    if (!gtmId) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    document.head.appendChild(s);
  }, [gtmId]);

  // Fire SPA page_view on route change
  useEffect(() => {
    if (!gtmId) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    window.dataLayer.push({
      event: 'page_view',
      page_location: window.location.origin + url,
      page_path: url,
      page_title: document?.title,
    });
  }, [pathname, searchParams, gtmId]);

  return null;
}
