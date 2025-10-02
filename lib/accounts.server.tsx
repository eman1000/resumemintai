// lib/accounts.server.ts
import { adminDb } from '@/lib/firebaseAdmin';
import { generateExternalUid } from '@/lib/externalUid';

export async function getOrSetExternalUid(accountId: string | null | undefined) {
  if (!accountId) return null;
  const ref = adminDb.collection('accounts').doc(accountId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() || {} : {};
  let externalUid = data.externalUid as string | undefined;

  if (!externalUid) {
    externalUid = generateExternalUid();
    await ref.set(
      { externalUid, updatedAt: new Date() },
      { merge: true }
    );
  }
  return externalUid;
}

export async function getAccountIdByExternalUid(externalUid: string) {
  if (!externalUid) return null;
  const snap = await adminDb
    .collection('accounts')
    .where('externalUid', '==', externalUid)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function recordSubscription(args: {
  provider: 'stripe' | string;
  providerSubId: string;
  accountId: string;
  status: string;
  currentPeriodEnd?: Date;
}) {
  const { provider, providerSubId, accountId, status, currentPeriodEnd } = args;

  await adminDb.collection('subscriptions').add({
    provider,
    providerSubId,
    accountId,
    status,
    currentPeriodEnd: currentPeriodEnd || null,
    createdAt: new Date(),
  });

  // Also mirror onto the account for quick checks (optional)
  await adminDb.collection('accounts').doc(accountId).set(
    {
      lastSubProvider: provider,
      lastSubId: providerSubId,
      lastSubStatus: status,
      lastSubPeriodEnd: currentPeriodEnd || null,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}
