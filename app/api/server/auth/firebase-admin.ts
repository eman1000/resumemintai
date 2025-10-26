// app/api/server/auth/firebase-admin.ts  (server-only file)
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP__: App | undefined;
}

export function getAdminApp(): App {
  if (globalThis.__FIREBASE_ADMIN_APP__) return globalThis.__FIREBASE_ADMIN_APP__!;
  if (getApps().length) {
    const app = getApp();
    globalThis.__FIREBASE_ADMIN_APP__ = app;
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin env vars');
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  globalThis.__FIREBASE_ADMIN_APP__ = app;
  return app;
}

export const adminAuth = () => getAuth(getAdminApp());
