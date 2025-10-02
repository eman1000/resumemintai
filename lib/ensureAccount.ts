// lib/ensureAccount.ts
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateExternalUid } from './externalUid';

type EnsureResult = { externalUid: string; created?: boolean };

export async function ensureAccountDoc(accountId: string, email?: string): Promise<EnsureResult> {
  const db = getFirestore();

  // Admin SDK style: collection().doc()
  const ref = db.collection('accounts').doc(accountId);

  const snap = await ref.get();

  if (!snap.exists) {
    const externalUid = generateExternalUid();
    await ref.set(
      {
        primaryEmail: (email || '').toLowerCase(),
        externalUid,
        createdAt: FieldValue.serverTimestamp(), // or new Date()
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { externalUid, created: true };
  }

  const data = snap.data() || {};
  if (!data.externalUid) {
    const externalUid = generateExternalUid();
    await ref.set(
      { externalUid, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { externalUid, created: false };
  }

  // keep email fresh if provided
  if (email && data.primaryEmail !== email.toLowerCase()) {
    await ref.set(
      { primaryEmail: email.toLowerCase(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  return { externalUid: String(data.externalUid), created: false };
}
