// components/ForceLinkAccount.tsx
'use client';

import * as React from 'react';
import { auth } from '@/app/firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
} from 'firebase/auth';
import toast from 'react-hot-toast';

async function ensureAfterAuth() {
  const t = auth.currentUser ? await auth.currentUser.getIdToken(true) : '';
  await fetch('/api/account/ensure', {
    method: 'POST',
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
}

export default function ForceLinkAccount() {
  const [needsLink, setNeedsLink] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // Show modal only when we have a user AND it’s anonymous.
      setNeedsLink(!!u && !!u.isAnonymous);
    });
    return () => unsub();
  }, []);

  const linkGoogle = async () => {
    setErrMsg(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();

      // Try popup; if blocked, fall back to redirect (browser will navigate away)
      try {
        await linkWithPopup(auth.currentUser!, provider);
      } catch (e: any) {
        if (e?.code === 'auth/popup-blocked') {
          await linkWithRedirect(auth.currentUser!, provider);
          return;
        }
        // Special case: the Google account is already linked to another Firebase user
        if (e?.code === 'auth/credential-already-in-use') {
          setErrMsg(
            'That Google account is already used by another login. Please use a different Google account.'
          );
          return;
        }
        throw e;
      }

      await ensureAfterAuth();
      toast.success('Account saved to Google. You’re all set!');
      setNeedsLink(false); // close the modal
    } catch (e: any) {
      setErrMsg(e?.message || 'Could not link Google.');
    } finally {
      setBusy(false);
    }
  };

  if (!needsLink) return null;

  // Full-screen blocking overlay
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold mb-2">Save your account</h2>
        <p className="text-sm text-neutral-400 mb-4">
          You’re currently using a temporary (anonymous) account. Link it to Google to keep your
          resume, settings and subscription across devices.
        </p>

        {!!errMsg && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-900/10 px-3 py-2 text-sm text-red-300">
            {errMsg}
          </div>
        )}

        <button
          onClick={linkGoogle}
          disabled={busy}
          className="w-full rounded-xl bg-white px-4 py-2 font-semibold text-black disabled:opacity-60"
        >
          {busy ? 'Linking…' : 'Continue with Google'}
        </button>

        <div className="mt-3 text-xs text-neutral-500">
          This step takes ~5 seconds. Once linked, you can sign in on any device.
        </div>
      </div>
    </div>
  );
}
