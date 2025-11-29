import { run } from '../db';
import pool from './pool';


export type DbUser = {
  id: string;
  email: string;
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

/** Create a users row for a guest, satisfying the CHECK (email OR firebase_uid). */
export async function ensureGuestAccount(pool: any, accountId: string) {
  await run(pool, (c) =>
    c.query(
      `
      INSERT INTO public.users (id, plan, email)
      VALUES ($1, 'free', $2)
      ON CONFLICT (id) DO NOTHING
      `,
      [accountId, mkGuestEmail(accountId)],
    ),
  );
  return accountId;
}

/** Replace placeholder guest email (or NULL) with a real email on claim */
export async function setUserEmailIfGuestOrEmpty(
  pool: any,
  userId: string,
  email?: string | null
) {
  const ne = (email || '').trim().toLowerCase() || null;
  if (!ne) return;

  await run(pool, (c) =>
    c.query(
      `
      UPDATE public.users
         SET email = $2,
             updated_at = timezone('utc', now())
       WHERE id = $1
         AND (email IS NULL OR email LIKE $3)
      `,
      [userId, ne, `guest+%@${GUEST_EMAIL_DOMAIN}`],
    ),
  );
}

const normEmail = (e: string) => e.trim().toLowerCase();

export async function getUserByEmail(pool: any, email: string) {
  const { rows } = await run(pool, (c) =>
    c.query<{ id: string; email: string | null; firebase_uid: string | null; stripe_customer_id: string | null }>(
      `SELECT id, email, firebase_uid, stripe_customer_id
       FROM public.users
       WHERE email = $1`,
      [normEmail(email)],
    ),
  );
  return rows[0] ?? null;
}


export async function getUserByFirebaseUid(uid: string): Promise<DbUser | null> {
  const { rows } = await run(pool, (c) =>
    c.query(
      `select id, email, firebase_uid, stripe_customer_id
       from app_users where firebase_uid = $1 limit 1`,
      [uid],
    ),
  );
  return rows[0] ?? null;
}



/** store/reuse Stripe customer id */
export async function setStripeCustomerId(pool: any, userId: string, customerId: string) {
  await run(pool, (c) =>
    c.query(
      `UPDATE public.users SET stripe_customer_id = $2 WHERE id = $1`,
      [userId, customerId],
    ),
  );
}


export async function ensureUserByEmail(pool: any, email: string) {
  const norm = email.trim().toLowerCase();
  const { rows } = await run(pool, (c) =>
    c.query<{ id: string }>(
      `
      INSERT INTO public.users (email)
      VALUES ($1)
      ON CONFLICT (email)
      DO UPDATE SET email = EXCLUDED.email
      RETURNING id
      `,
      [norm],
    ),
  );
  return rows[0].id;
}

export async function getOrCreateUserId(pool: any, firebaseUid: string, email?: string | null) {
  const { rows } = await run(pool, (c) =>
    c.query<{ id: string }>(
      `
      INSERT INTO public.users (firebase_uid, email)
      VALUES ($1, $2)
      ON CONFLICT (firebase_uid)
      DO UPDATE SET email = COALESCE(EXCLUDED.email, public.users.email)
      RETURNING id
      `,
      [firebaseUid, email ?? null],
    ),
  );
  return rows[0].id;
}

/** When a guest later signs in with Firebase, link their UID without breaking uniqueness */
export async function linkFirebaseUid(pool: any, userId: string, firebaseUid: string) {
  await run(pool, (c) =>
    c.query(
      `
      UPDATE public.users
      SET firebase_uid = $2
      WHERE id = $1 AND firebase_uid IS NULL
      `,
      [userId, firebaseUid],
    ),
  );
}


/**
 * Ensures there's exactly one row for this Firebase user.
 * - If a row has this firebase_uid, returns it (and optionally updates email).
 * - Else if a row has this email with NULL firebase_uid, claims it by setting firebase_uid.
 * - Else if a row has this email with a DIFFERENT firebase_uid, returns that row's id (account already exists).
 * - Else inserts a new row.
 *
 * Assumes:
 *   - public.users(firebase_uid TEXT UNIQUE, email TEXT UNIQUE NULLABLE)
 *   - triggers for created_at/updated_at, or we set updated_at manually
 */
export async function ensureDbUserByFirebaseUid(
  firebaseUid: string,
  email?: string | null
): Promise<string> {
  const normEmail = (email || '').trim().toLowerCase() || null;

  const sql = `
    WITH
    -- 1) Update by UID if exists
    by_uid AS (
      UPDATE public.users
         SET email = COALESCE($2, public.users.email),
             updated_at = now()
       WHERE firebase_uid = $1
       RETURNING id
    ),
    -- 2) If not updated by UID, try to claim existing email record with NULL firebase_uid
    claim_email AS (
      UPDATE public.users
         SET firebase_uid = $1,
             updated_at = now()
       WHERE (SELECT COUNT(*) FROM by_uid) = 0
         AND $2 IS NOT NULL
         AND email = $2
         AND firebase_uid IS NULL
       RETURNING id
    ),
    -- 3) If email exists but already bound to some UID, just pick it (no write)
    bound_email AS (
      SELECT u.id
        FROM public.users u
       WHERE (SELECT COUNT(*) FROM by_uid) = 0
         AND (SELECT COUNT(*) FROM claim_email) = 0
         AND $2 IS NOT NULL
         AND u.email = $2
         AND u.firebase_uid IS NOT NULL
       LIMIT 1
    ),
    -- 4) If none of the above matched, insert a fresh row
    ins AS (
      INSERT INTO public.users (firebase_uid, email, created_at, updated_at)
      SELECT $1, $2, now(), now()
      WHERE (SELECT COUNT(*) FROM by_uid) = 0
        AND (SELECT COUNT(*) FROM claim_email) = 0
        AND (SELECT COUNT(*) FROM bound_email) = 0
      RETURNING id
    )
    SELECT id FROM by_uid
    UNION ALL SELECT id FROM claim_email
    UNION ALL SELECT id FROM bound_email
    UNION ALL SELECT id FROM ins
    LIMIT 1;
  `;

  const { rows } = await run(pool, (c) =>
    c.query<{ id: string }>(sql, [firebaseUid, normEmail])
  );

  if (!rows[0]?.id) {
    throw new Error('ensureDbUserByFirebaseUid failed to resolve an id');
  }
  return rows[0].id;
}

/** Look up internal user id (no upsert) */
export async function getUserIdByFirebaseUid(pool: any, firebaseUid: string) {
  const { rows } = await run(pool, (c) =>
    c.query<{ id: string }>(
      `select id from public.users where firebase_uid = $1 limit 1`,
      [firebaseUid],
    ),
  );
  return rows[0]?.id ?? null;
}


/** Get Stripe customer id by accountId (= users.id) */
export async function getStripeCustomerIdByAccountId(
  pool: any,
  accountId: string
): Promise<string | null> {
  const { rows } = await run(pool, (c) =>
    c.query<{ stripe_customer_id: string | null }>(
      `
      SELECT stripe_customer_id
      FROM public.users
      WHERE id = $1
      LIMIT 1
      `,
      [accountId],
    ),
  );
  return rows[0]?.stripe_customer_id ?? null;
}

/** Upsert Stripe customer id on the users row (by accountId) */
export async function setStripeCustomerIdByAccountId(
  pool: any,
  accountId: string,
  customerId: string
): Promise<void> {
  await run(pool, (c) =>
    c.query(
      `
      UPDATE public.users
      SET stripe_customer_id = $2,
          updated_at = timezone('utc', now())
      WHERE id = $1
      `,
      [accountId, customerId],
    ),
  );
}

/**
 * Link a Firebase UID to an existing account (users.id).
 * If already linked to another UID, throws an error with status=409.
 */
export async function linkAuthUserToAccount(
  pool: any,
  uid: string,
  accountId: string
): Promise<{ id: string; firebase_uid: string | null }> {
  const { rows } = await run(pool, async (c) => {
    const check = await c.query<{ firebase_uid: string | null }>(
      `SELECT firebase_uid FROM public.users WHERE id = $1`,
      [accountId],
    );
    if (!check.rowCount) {
      const e: any = new Error('account_not_found');
      e.status = 404;
      throw e;
    }

    const current = check.rows[0].firebase_uid;
    if (current && current !== uid) {
      const e: any = new Error('account_claim_conflict');
      e.status = 409;
      throw e;
    }

    return c.query<{ id: string; firebase_uid: string | null }>(
      `
      UPDATE public.users
      SET firebase_uid = COALESCE(firebase_uid, $2),
          updated_at = timezone('utc', now())
      WHERE id = $1
      RETURNING id, firebase_uid
      `,
      [accountId, uid],
    );
  });

  return rows[0];
}



async function getUserById(c: any, id: string): Promise<UserRow | null> {
  const { rows } = await c.query(
    `SELECT id, email, firebase_uid, stripe_customer_id, stripe_subscription_id
       FROM public.users
      WHERE id = $1
      LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}



/**
 * Merge a "guest" account into an existing user (survivor).
 * - Moves child rows (resumes, subscriptions)
 * - If survivor has no customer, adopts guest's customer:
 *     1) NULL guest.stripe_customer_id (to satisfy UNIQUE)
 *     2) SET survivor.stripe_customer_id = guest's value
 * - Deletes the guest row
 */
export async function mergeGuestAccountIntoUser(
  pool: any,
  guestAccountId: string,
  survivorUserId: string
): Promise<{ userId: string; adoptedCustomerId: string | null }> {
  if (guestAccountId === survivorUserId) {
    return { userId: survivorUserId, adoptedCustomerId: null };
  }

  return run(pool, async (c) => {
    await c.query('BEGIN');

    // Lock both rows to prevent races
    const guest = await getUserById(c, guestAccountId);
    const survivor = await getUserById(c, survivorUserId);
    if (!guest) { await c.query('ROLLBACK'); throw new Error('merge_guest_not_found'); }
    if (!survivor) { await c.query('ROLLBACK'); throw new Error('merge_survivor_not_found'); }

    // Move children first
    await c.query(`UPDATE public.resumes SET user_id = $2 WHERE user_id = $1`, [guestAccountId, survivorUserId]);
    await c.query(`UPDATE public.subscriptions SET user_id = $2 WHERE user_id = $1`, [guestAccountId, survivorUserId]);

    let adoptedCustomerId: string | null = null;

    // ADOPT ONLY IF survivor missing a customer and guest has one
    if (!survivor.stripe_customer_id && guest.stripe_customer_id) {
      // 1) Clear on guest to avoid UNIQUE conflict
      await c.query(
        `UPDATE public.users
            SET stripe_customer_id = NULL,
                stripe_subscription_id = NULL,
                updated_at = timezone('utc', now())
          WHERE id = $1`,
        [guestAccountId],
      );

      // 2) Set on survivor
      await c.query(
        `UPDATE public.users
            SET stripe_customer_id = $2,
                stripe_subscription_id = COALESCE($3, stripe_subscription_id),
                updated_at = timezone('utc', now())
          WHERE id = $1`,
        [survivorUserId, guest.stripe_customer_id, guest.stripe_subscription_id],
      );

      adoptedCustomerId = guest.stripe_customer_id;
    }

    // Delete guest last
    await c.query(`DELETE FROM public.users WHERE id = $1`, [guestAccountId]);

    await c.query('COMMIT');
    return { userId: survivorUserId, adoptedCustomerId };
  });
}
