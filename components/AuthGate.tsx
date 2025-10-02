'use client';
import { useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setReady(true);
        setOk(false);
        router.push('/login'); // or show inline login
        return;
      }
      try {
        const idToken = await user.getIdToken(true);
        const res = await fetch('/api/account/ensure', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'ensure_failed');

      // ✅ enforce subscription here
      if (!json.subscribed) {
        router.push('/landing/vtdft'); // or '/pricing'
        return;
      }

      setOk(true);
      } catch (e) {
        console.error('AuthGate ensure error', e);
        setOk(false);
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, [router]);

  if (!ready) return <div className="p-6 text-sm text-neutral-400">Checking access…</div>;
  if (!ok) return null;
  return <>{children}</>;
}
