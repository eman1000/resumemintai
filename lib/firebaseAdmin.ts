// lib/firebaseAdmin.ts
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL!;
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
// Firebase Storage uses two bucket-name formats: the legacy `.appspot.com`
// for projects created before late 2024, and the new `.firebasestorage.app`
// for projects created after. There's no programmatic way to know which one
// applies without an extra API call, so the env var is the source of truth.
// We fall back to the new format because that's what new projects ship with.
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`;

const app = getApps()[0] ?? initializeApp({
  credential: cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }),
  storageBucket: BUCKET,
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket(BUCKET);
