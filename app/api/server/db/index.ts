import type { Pool, PoolClient } from 'pg';

export function debugSql(sql: string, values: unknown[]) {
  return sql.replace(/\$(\d+)/g, (_, n) => {
    const v = values[Number(n) - 1];

    if (v === null || v === undefined) return 'NULL';

    if (Array.isArray(v)) {
      const elems = v.map((x) => {
        if (x === null || x === undefined) return 'NULL';
        if (x instanceof Date) return `'${x.toISOString().replace(/'/g, "''")}'`;
        if (typeof x === 'object') return `'${JSON.stringify(x).replace(/'/g, "''")}'`;
        return `'${String(x).replace(/'/g, "''")}'`;
      }).join(',');
      return `ARRAY[${elems}]`;
    }

    if (v instanceof Date) return `'${v.toISOString().replace(/'/g, "''")}'`;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;

    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

const RETRIABLE_CODES = new Set([
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '08000', '08003', '08006', // connection errors
  '53300', // too_many_connections
  'XX000', // generic; often surfaced by PgBouncer/Neon
]);

function isRetriable(e: any) {
  const code = e?.code as string | undefined;
  const msg = String(e?.message || '');
  return (
    (code && RETRIABLE_CODES.has(code)) ||
    /ECONNRESET|terminat|closed|db_termination|Connection terminated|timeout exceeded/i.test(msg)
  );
}

function backoff(attempt: number) {
  const base = 200 + attempt * 300;
  const jitter = Math.floor(Math.random() * 150);
  return base + jitter;
}

/**
 * Acquire a client, run a short critical section, always release.
 * Keep `fn(c)` minimal — no network calls inside.
 */
export async function run<T>(
  pool: Pool,
  fn: (c: PoolClient) => Promise<T>,
  attempt = 0
): Promise<T> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    return await fn(client);
  } catch (e: any) {
    if (isRetriable(e) && attempt < 2) {
      // yield before retry to avoid stampede
      await new Promise((r) => setTimeout(r, backoff(attempt)));
      return run(pool, fn, attempt + 1);
    }
    throw e;
  } finally {
    if (client) client.release();
  }
}

/**
 * Same as run(), but ensures one row returned.
 */
export async function runGetOne<T>(
  pool: Pool,
  f: (c: PoolClient) => Promise<{ rows: any[] }>
) {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const { rows } = await f(client);
    if (!rows.length) throw new Error('Query returned no rows');
    return rows[0] as T;
  } finally {
    if (client) client.release();
  }
}

/**
 * Transaction with optional per-tx statement timeout (ms).
 * Keep the work purely SQL; no remote I/O inside.
 */
export async function runTx<T>(
  pool: Pool,
  fn: (c: PoolClient) => Promise<T>,
  opts: { statementTimeoutMs?: number } = {}
): Promise<T> {
  let c: PoolClient | null = null;
  try {
    c = await pool.connect();
    await c.query('BEGIN');
    if (opts.statementTimeoutMs && Number.isFinite(opts.statementTimeoutMs)) {
      await c.query('SET LOCAL statement_timeout = $1', [opts.statementTimeoutMs]);
    }
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    try { if (c) await c.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    if (c) c.release();
  }
}

/**
 * Fire-and-forget helper that logs errors but never throws.
 * Useful for non-critical inserts (metrics, logs).
 */
export const run_ = <T>(pool: Pool, f: (c: PoolClient) => Promise<T>) =>
  run(pool, f).catch((err) => console.error('[run_]', err));
