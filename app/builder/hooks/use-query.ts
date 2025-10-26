// src/lib/use-query.ts (or wherever you keep hooks)
'use client';

import { useEffect, useMemo, useState } from 'react';

function getSearch(): string {
  if (typeof window === 'undefined') return '';
  return window.location.search || '';
}

export function useQuery(): URLSearchParams | null {
  const [search, setSearch] = useState<string>(getSearch());

  useEffect(() => {
    const onChange = () => setSearch(getSearch());

    // React to browser back/forward
    window.addEventListener('popstate', onChange);

    // React to programmatic router changes (pushState/replaceState)
    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (...args) {
      const ret = origPush.apply(this, args as any);
      window.dispatchEvent(new Event('locationchange'));
      return ret;
    } as typeof history.pushState;

    history.replaceState = function (...args) {
      const ret = origReplace.apply(this, args as any);
      window.dispatchEvent(new Event('locationchange'));
      return ret;
    } as typeof history.replaceState;

    window.addEventListener('locationchange', onChange);

    // Initial sync (in case we mounted before first paint)
    onChange();

    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener('locationchange', onChange);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  // Recreate URLSearchParams only when the raw string changes
  return useMemo(() => {
    if (!search) return new URLSearchParams('');
    return new URLSearchParams(search);
  }, [search]);
}

export function useQueryParam(key: string): string | null {
  const qp = useQuery();
  return qp?.get(key) ?? null;
}
