// lib/firebaseAdmin.ts
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL!;
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.appspot.com`; // fallback

const app = getApps()[0] ?? initializeApp({
  credential: cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }),
  storageBucket: BUCKET,
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket(BUCKET);
