// app/lib/ensureAnon.ts
'use client';
import { auth, authReady } from '@/app/firebase';
import { signInAnonymously } from 'firebase/auth';

// prevent re-entrant/duplicate creates across re-renders/tabs
let inflight: Promise<void> | null = null;

export async function ensureAnonOnce() {
  await authReady;                 // wait until Firebase restores any existing user
  if (auth.currentUser) return;    // already have a user — do nothing
  if (!inflight) {
    inflight = signInAnonymously(auth)
      .catch(e => { inflight = null; throw e; })
      .then(() => { inflight = null; });
  }
  return inflight;
}
