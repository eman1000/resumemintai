// app/logout/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/firebase';
import { signOut } from 'firebase/auth';

export default function LogoutPage() {
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // 1) Firebase sign-out (client)
        try { await signOut(auth); } catch {}

        // 2) Clear any localStorage you used in the guest flow
        try {
          localStorage.removeItem('resumemint_account_id');
          localStorage.removeItem('resumemint_stripe_customer_id');
          localStorage.removeItem('emailForClaim');
        } catch {}

        // 3) Tell server to clear the cookie session (if any)
        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}

        setDone(true);
      } finally {
        // 4) Redirect somewhere public
        router.replace('/');
      }
    })();
  }, [router]);

  return (
    <main className="min-h-screen grid place-items-center text-white">
      <div className="text-center space-y-2">
        <div className="text-lg">Signing you out…</div>
        {!done && <div className="text-sm text-white/70">One moment</div>}
      </div>
    </main>
  );
}
