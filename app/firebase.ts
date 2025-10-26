'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/** Ensure we never init twice across HMR */
declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_APP__: FirebaseApp | undefined;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Prefer a cached app on globalThis (survives Fast Refresh)
const _app =
  globalThis.__FIREBASE_APP__ ??
  (getApps().length ? getApp() : initializeApp(firebaseConfig));

globalThis.__FIREBASE_APP__ = _app;

// Export singletons
export const auth = getAuth(_app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(_app);

// Persist auth only in the browser
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// A one-time promise that resolves when the first auth state is known
let _authReadyResolve: (v?: unknown) => void;
export const authReady = new Promise(res => (_authReadyResolve = res));
onAuthStateChanged(auth, () => _authReadyResolve?.());
