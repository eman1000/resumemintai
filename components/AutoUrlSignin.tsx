'use client';
import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Route } from 'next'; // 👈 add this
import { getAuth, signInWithCustomToken } from 'firebase/auth';

export default function AutoUrlSignin() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const uid = sp.get('uid');
    const exp = sp.get('exp');
    const sig = sp.get('sig');
    if (!uid || !exp || !sig) return;

    (async () => {
      try {
        const r = await fetch(
          `/api/link/external/exchange?uid=${encodeURIComponent(uid)}&exp=${exp}&sig=${encodeURIComponent(sig)}`
        );
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || 'exchange_failed');

        const auth = getAuth();
        await signInWithCustomToken(auth, json.customToken);

        // Clean the URL (remove uid/exp/sig) then continue
        const url = new URL(window.location.href);
        url.searchParams.delete('uid');
        url.searchParams.delete('exp');
        url.searchParams.delete('sig');

        const cleanHref =
          `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''}${url.hash}` as Route;

        router.replace(cleanHref);
      } catch (e) {
        console.error('AutoUrlSignin error', e);
      }
    })();
  }, [sp, router]);

  return null;
}
