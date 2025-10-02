'use client';

import PageShell from '@/components/PageShell';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '@/app/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

// If you want to ensure this page doesn't try to prerender statically,
// uncomment the next line:
// export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={<>...</>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ret = params.get('return') || '/builder';

  useEffect(() => {
    // no-op; could auto-redirect if already logged in
  }, []);

  return (
    <PageShell title="Sign in" subtitle="Continue with Google to access the builder.">
      <button
        onClick={async () => {
          await signInWithPopup(auth, provider);
          router.push(ret as any);
        }}
        className="w-full rounded-xl bg-white text-black font-semibold px-4 py-2"
      >
        Continue with Google
      </button>
    </PageShell>
  );
}
