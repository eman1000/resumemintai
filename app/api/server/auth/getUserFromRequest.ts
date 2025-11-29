import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';

export type AuthUser = {
  uid: string;
  email?: string | null;
  emailVerified?: boolean;
  displayName?: string | null;
  photoURL?: string | null;
  claims?: import('firebase-admin').auth.DecodedIdToken;
};

function extractBearer(h: Headers): string | undefined {
  const v = h.get('authorization') || h.get('Authorization');
  return v?.match(/^Bearer\s+(.+)$/i)?.[1];
}

export async function getUserFromRequest(_req?: NextRequest): Promise<AuthUser> {
  const h = headers();
  const bearer = extractBearer(h);
  let idToken = bearer ?? cookies().get('session')?.value;
  if (!idToken) {
    const e = new Error('Missing auth token'); (e as any).name = 'UNAUTHORIZED'; throw e;
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      claims: decoded,
    };
  } catch {
    const e = new Error('Invalid or expired auth token'); (e as any).name = 'UNAUTHORIZED'; throw e;
  }
}
