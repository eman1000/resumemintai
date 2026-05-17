// app/components/AuthGate.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase';
import Logo from '@/components/Logo';

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
    return <AuthGateLoader />;
  }
  if (!ok) return null;
  return <>{children}</>;
}

function AuthGateLoader() {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-white">
      <div className="flex flex-col items-center gap-5">
        <Logo size="xl" />
        <div className="flex items-center gap-2 text-sm text-[#52525a]">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
          Loading your account…
        </div>
      </div>
    </div>
  );
}
