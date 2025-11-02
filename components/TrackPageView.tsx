// app/TrackPageView.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@/app/builder/hooks/use-query';

declare global { interface Window { gtag?: (...args: any[]) => void } }

export default function TrackPageView() {
  const pathname = usePathname();
  const search = useQuery();

  useEffect(() => {
    if (!window.gtag) return;
    const url = pathname + (search?.toString() ? `?${search}` : '');
    window.gtag('event', 'page_view', {
      page_location: window.location.origin + url,
      page_path: pathname,
      page_title: document.title || undefined,
    });
  }, [pathname, search]);

  return null;
}
