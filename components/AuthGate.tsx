// app/components/AuthGate.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!alive) return;
        setReady(true);
        setOk(false);
        router.push('/login'); // or inline login
        return;
      }

      try {
        const idToken = await user.getIdToken(true);
        const res = await fetch('/api/account/ensure', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (res.status === 401) {
          // token invalid / expired → send to login
          if (!alive) return;
          setReady(true);
          setOk(false);
          router.push('/login');
          return;
        }

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'ensure_failed');

        if (!json.subscribed) {
          // not subscribed → send to your paywall/landing
          router.push('/landing/vtdft');
          return;
        }

        if (!alive) return;
        setOk(true);
      } catch (e) {
        console.error('AuthGate ensure error', e);
        if (!alive) return;
        setOk(false);
      } finally {
        if (!alive) return;
        setReady(true);
      }
    });

    return () => {
      alive = false;
      unsub();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="p-6 text-sm text-[#a1a1aa]">
        Checking access…
      </div>
    );
  }
  if (!ok) return null;
  return <>{children}</>;
}
