'use client';

import PageShell from '@/components/PageShell';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, provider } from '@/app/firebase';
import { useQuery } from '@/app/builder/hooks/use-query';

export default function LoginPage() {
  return (
    <Suspense fallback={<>...</>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useQuery();
  const ret = params?.get('return') || '/builder';

  // optional: prefill from query (?email=...&pw=...)
  const [email, setEmail] = useState(params?.get('email') || '');
  const [pw, setPw] = useState(params?.get('pw') || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upsertEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email || !pw) {
      setErr('Enter email and password');
      return;
    }
    setBusy(true);
    try {
      // Try sign-in; if not found, create then sign-in
      await signInWithEmailAndPassword(auth, email, pw);
      // @ts-ignore
      router.push(ret as string);
    } catch (e: any) {
      if (e?.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, pw);
          // @ts-ignore
          router.push(ret as string);
        } catch (ce: any) {
          setErr(humanize(ce));
        } finally {
          setBusy(false);
        }
        return;
      }
      setErr(humanize(e));
      setBusy(false);
    }
  }

  return (
    <PageShell title="Sign in" subtitle="Use Google or email/password to access the builder.">
      {/* Google OAuth */}
      <button
        onClick={async () => {
          setErr(null);
          setBusy(true);
          try {
            await signInWithPopup(auth, provider);
            // @ts-ignore
            router.push(ret as string);
          } catch (e) {
            setErr(humanize(e));
          } finally {
            setBusy(false);
          }
        }}
        className="w-full rounded-xl bg-white text-black font-semibold px-4 py-2 mb-4 disabled:opacity-60"
        disabled={busy}
      >
        Continue with Google
      </button>

      <div className="text-xs text-neutral-400 text-center my-3">— or —</div>

      {/* Email / Password */}
      <form onSubmit={upsertEmailPassword} className="space-y-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email"
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-white text-black font-semibold px-4 py-2 disabled:opacity-60"
          disabled={busy}
        >
          {busy ? 'Please wait…' : 'Continue with Email'}
        </button>
      </form>

    
    </PageShell>
  );
}

function humanize(e: any) {
  const code = e?.code || '';
  if (code === 'auth/wrong-password') return 'Wrong password.';
  if (code === 'auth/invalid-email') return 'Invalid email address.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
  return e?.message || 'Something went wrong.';
}
