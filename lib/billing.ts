import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import '@/lib/firebaseAdmin';

export async function isSubscribed(accountId: string) {
  const db = getFirestore();
  const q = await db.collection('subscriptions')
    .where('accountId', '==', accountId)
    .where('status', 'in', ['active','trialing','past_due'])
    .get();

  const now = Date.now();
  return q.docs.some(d => {
    const end = d.data().currentPeriodEnd;
    const endMs = end instanceof Timestamp ? end.toMillis() : new Date(end).getTime();
    return endMs > now;
  });
}

/** Normalize writes from any PSP */
export async function upsertSubscription(data: {
  provider: string;
  providerSubscriptionId: string;
  accountId: string;
  productId: string;
  status: string;
  currentPeriodEnd: Date;
  currency?: string;
  amount?: number;
  raw?: any;
}) {
  const db = getFirestore();
  const id = `${data.provider}:${data.providerSubscriptionId}`;
  await db.collection('subscriptions').doc(id).set({
    ...data,
    currentPeriodEnd: data.currentPeriodEnd,
    updatedAt: new Date(),
  }, { merge: true });
}

/** Find or create a mapping from PSP customer → accountId */
export async function resolveAccountIdFromCustomer(
  provider: string,
  providerCustomerId: string,
  email?: string
) {
  const db = getFirestore();
  const custId = `${provider}:${providerCustomerId}`;
  const custRef = db.collection('customers').doc(custId);
  const snap = await custRef.get();
  if (snap.exists) return snap.data()!.accountId as string;

  // No mapping yet → create a new account
  const { generateExternalUid } = await import('@/lib/externalUid');
  const acctRef = db.collection('accounts').doc();
  await acctRef.set({
    primaryEmail: email || '',
    externalUid: generateExternalUid(),
    createdAt: new Date(),
  });

  await custRef.set({
    provider,
    providerCustomerId,
    accountId: acctRef.id,
    email: email || '',
    createdAt: new Date(),
  });

  return acctRef.id;
}
