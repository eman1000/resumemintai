import prisma from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

export type DbUser = {
  id: string;
  email: string | null;
  firebase_uid: string | null;
  stripe_customer_id: string | null;
};

export type UserRow = {
  id: string;
  email: string | null;
  firebase_uid: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

// ---- guest email helpers ----
const GUEST_EMAIL_DOMAIN = 'noemail.resumemint';
export const mkGuestEmail = (accountId: string) =>
  `guest+${accountId}@${GUEST_EMAIL_DOMAIN}`;

const normEmail = (e: string) => e.trim().toLowerCase();

/**
 * Most exports accept a legacy `pool` first arg from the old pg implementation.
 * It's kept for signature compatibility but ignored — Prisma manages connections.
 */
type Client = PrismaClient | Prisma.TransactionClient;
const cx = (_unused?: unknown): Client => prisma;

/** Create a users row for a guest, satisfying the CHECK (email OR firebase_uid). */
export async function ensureGuestAccount(_pool: unknown, accountId: string) {
  await cx(_pool).user.upsert({
    where: { id: accountId },
    update: {},
    create: {
      id: accountId,
      plan: 'free',
      email: mkGuestEmail(accountId),
    },
  });
  return accountId;
}

/** Replace placeholder guest email (or NULL) with a real email on claim */
export async function setUserEmailIfGuestOrEmpty(
  _pool: unknown,
  userId: string,
  email?: string | null,
) {
  const ne = (email || '').trim().toLowerCase() || null;
  if (!ne) return;

  // Only update if current email is null or matches the guest pattern.
  await cx(_pool).$executeRaw`
    UPDATE public.users
       SET email = ${ne}, updated_at = timezone('utc', now())
     WHERE id = ${userId}::uuid
       AND (email IS NULL OR email LIKE ${'guest+%@' + GUEST_EMAIL_DOMAIN})
  `;
}

export async function getUserByEmail(_pool: unknown, email: string) {
  const u = await cx(_pool).user.findUnique({
    where: { email: normEmail(email) },
    select: { id: true, email: true, firebaseUid: true, stripeCustomerId: true },
  });
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    firebase_uid: u.firebaseUid,
    stripe_customer_id: u.stripeCustomerId,
  };
}

export async function getUserByFirebaseUid(uid: string): Promise<DbUser | null> {
  const u = await prisma.user.findUnique({
    where: { firebaseUid: uid },
    select: { id: true, email: true, firebaseUid: true, stripeCustomerId: true },
  });
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    firebase_uid: u.firebaseUid,
    stripe_customer_id: u.stripeCustomerId,
  };
}

/** store/reuse Stripe customer id */
export async function setStripeCustomerId(_pool: unknown, userId: string, customerId: string) {
  await cx(_pool).user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

export async function ensureUserByEmail(_pool: unknown, email: string) {
  const norm = normEmail(email);
  const u = await cx(_pool).user.upsert({
    where: { email: norm },
    update: { email: norm },
    create: { email: norm },
    select: { id: true },
  });
  return u.id;
}

export async function getOrCreateUserId(
  _pool: unknown,
  firebaseUid: string,
  email?: string | null,
) {
  const u = await cx(_pool).user.upsert({
    where: { firebaseUid },
    update: email ? { email } : {},
    create: { firebaseUid, email: email ?? null },
    select: { id: true },
  });
  return u.id;
}

/** When a guest later signs in with Firebase, link their UID without breaking uniqueness */
export async function linkFirebaseUid(
  _pool: unknown,
  userId: string,
  firebaseUid: string,
) {
  await cx(_pool).$executeRaw`
    UPDATE public.users
       SET firebase_uid = ${firebaseUid}
     WHERE id = ${userId}::uuid AND firebase_uid IS NULL
  `;
}

/**
 * Ensures there's exactly one row for this Firebase user.
 * Mirrors the original 4-CTE logic: update-by-uid → claim-empty-email → bind-to-existing-email → insert.
 * Kept as raw SQL to preserve atomic semantics under concurrent calls.
 */
export async function ensureDbUserByFirebaseUid(
  firebaseUid: string,
  email?: string | null,
): Promise<string> {
  const norm = (email || '').trim().toLowerCase() || null;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH
    by_uid AS (
      UPDATE public.users
         SET email = COALESCE(${norm}, public.users.email),
             updated_at = now()
       WHERE firebase_uid = ${firebaseUid}
       RETURNING id
    ),
    claim_email AS (
      UPDATE public.users
         SET firebase_uid = ${firebaseUid},
             updated_at = now()
       WHERE (SELECT COUNT(*) FROM by_uid) = 0
         AND ${norm}::text IS NOT NULL
         AND email = ${norm}
         AND firebase_uid IS NULL
       RETURNING id
    ),
    bound_email AS (
      SELECT u.id
        FROM public.users u
       WHERE (SELECT COUNT(*) FROM by_uid) = 0
         AND (SELECT COUNT(*) FROM claim_email) = 0
         AND ${norm}::text IS NOT NULL
         AND u.email = ${norm}
         AND u.firebase_uid IS NOT NULL
       LIMIT 1
    ),
    ins AS (
      INSERT INTO public.users (firebase_uid, email, created_at, updated_at)
      SELECT ${firebaseUid}, ${norm}, now(), now()
       WHERE (SELECT COUNT(*) FROM by_uid) = 0
         AND (SELECT COUNT(*) FROM claim_email) = 0
         AND (SELECT COUNT(*) FROM bound_email) = 0
      RETURNING id
    )
    SELECT id FROM by_uid
    UNION ALL SELECT id FROM claim_email
    UNION ALL SELECT id FROM bound_email
    UNION ALL SELECT id FROM ins
    LIMIT 1
  `;

  if (!rows[0]?.id) {
    throw new Error('ensureDbUserByFirebaseUid failed to resolve an id');
  }
  return rows[0].id;
}

/** Look up internal user id (no upsert) */
export async function getUserIdByFirebaseUid(_pool: unknown, firebaseUid: string) {
  const u = await cx(_pool).user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
  return u?.id ?? null;
}

/** Get Stripe customer id by accountId (= users.id) */
export async function getStripeCustomerIdByAccountId(
  _pool: unknown,
  accountId: string,
): Promise<string | null> {
  const u = await cx(_pool).user.findUnique({
    where: { id: accountId },
    select: { stripeCustomerId: true },
  });
  return u?.stripeCustomerId ?? null;
}

/** Upsert Stripe customer id on the users row (by accountId) */
export async function setStripeCustomerIdByAccountId(
  _pool: unknown,
  accountId: string,
  customerId: string,
): Promise<void> {
  await cx(_pool).user.update({
    where: { id: accountId },
    data: { stripeCustomerId: customerId },
  });
}

/**
 * Link a Firebase UID to an existing account (users.id).
 * Throws { status: 404 } if account not found, { status: 409 } if UID already
 * bound to a different account.
 */
export async function linkAuthUserToAccount(
  _pool: unknown,
  uid: string,
  accountId: string,
): Promise<{ id: string; firebase_uid: string | null }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: accountId },
      select: { firebaseUid: true },
    });
    if (!existing) {
      const e: any = new Error('account_not_found');
      e.status = 404;
      throw e;
    }
    if (existing.firebaseUid && existing.firebaseUid !== uid) {
      const e: any = new Error('account_claim_conflict');
      e.status = 409;
      throw e;
    }
    const updated = await tx.user.update({
      where: { id: accountId },
      data: { firebaseUid: existing.firebaseUid ?? uid },
      select: { id: true, firebaseUid: true },
    });
    return { id: updated.id, firebase_uid: updated.firebaseUid };
  });
}

/**
 * Merge a "guest" account into an existing user (survivor).
 * - Moves child rows (resumes, cover_letters, subscriptions, job_results)
 * - If survivor has no customer, adopts guest's customer
 * - Deletes the guest row
 */
export async function mergeGuestAccountIntoUser(
  _pool: unknown,
  guestAccountId: string,
  survivorUserId: string,
): Promise<{ userId: string; adoptedCustomerId: string | null }> {
  if (guestAccountId === survivorUserId) {
    return { userId: survivorUserId, adoptedCustomerId: null };
  }

  return prisma.$transaction(async (tx) => {
    const guest = await tx.user.findUnique({
      where: { id: guestAccountId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });
    if (!guest) throw new Error('merge_guest_not_found');

    const survivor = await tx.user.findUnique({
      where: { id: survivorUserId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });
    if (!survivor) throw new Error('merge_survivor_not_found');

    // Move children first
    await tx.resume.updateMany({
      where: { userId: guestAccountId },
      data: { userId: survivorUserId },
    });
    await tx.coverLetter.updateMany({
      where: { userId: guestAccountId },
      data: { userId: survivorUserId },
    });
    await tx.subscription.updateMany({
      where: { userId: guestAccountId },
      data: { userId: survivorUserId },
    });
    await tx.jobResult.updateMany({
      where: { userId: guestAccountId },
      data: { userId: survivorUserId },
    });

    let adoptedCustomerId: string | null = null;

    if (!survivor.stripeCustomerId && guest.stripeCustomerId) {
      // 1) Clear on guest to free UNIQUE
      await tx.user.update({
        where: { id: guestAccountId },
        data: { stripeCustomerId: null, stripeSubscriptionId: null },
      });

      // 2) Set on survivor
      await tx.user.update({
        where: { id: survivorUserId },
        data: {
          stripeCustomerId: guest.stripeCustomerId,
          stripeSubscriptionId: guest.stripeSubscriptionId ?? survivor.stripeSubscriptionId,
        },
      });

      adoptedCustomerId = guest.stripeCustomerId;
    }

    await tx.user.delete({ where: { id: guestAccountId } });

    return { userId: survivorUserId, adoptedCustomerId };
  });
}
