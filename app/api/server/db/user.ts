// app/api/server/db/users.ts
import type { Pool } from 'pg';
import { run } from '../db';
import pool from './pool';


export type DbUser = {
  id: string;
  email: string;
  firebase_uid: string | null;
  stripe_customer_id: string | null;
};

const normEmail = (e: string) => e.trim().toLowerCase();

export async function getUserByEmail(pool: Pool, email: string) {
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
export async function setStripeCustomerId(pool: Pool, userId: string, customerId: string) {
  await run(pool, (c) =>
    c.query(
      `UPDATE public.users SET stripe_customer_id = $2 WHERE id = $1`,
      [userId, customerId],
    ),
  );
}


export async function ensureUserByEmail(pool: Pool, email: string) {
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

export async function getOrCreateUserId(pool: Pool, firebaseUid: string, email?: string | null) {
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
export async function linkFirebaseUid(pool: Pool, userId: string, firebaseUid: string) {
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
export async function getUserIdByFirebaseUid(pool: Pool, firebaseUid: string) {
  const { rows } = await run(pool, (c) =>
    c.query<{ id: string }>(
      `select id from public.users where firebase_uid = $1 limit 1`,
      [firebaseUid],
    ),
  );
  return rows[0]?.id ?? null;
}
