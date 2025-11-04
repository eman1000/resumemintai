// server/db/index.ts
import { Pool, PoolClient, PoolConfig } from 'pg';

export { Pool };

export function debugSql(sql: string, values: unknown[]) {
  return sql.replace(/\$(\d+)/g, (_, n) => {
    const v = values[Number(n) - 1];
    if (Array.isArray(v)) {
      const elems = v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(',');
      return `ARRAY[${elems}]::text[]`;
    }
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

const RETRIABLE_CODES = new Set([
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '08000', '08003', '08006', // connection errors
  'XX000', // db_termination seen via PgBouncer
]);

export async function run<T>(
  pool: Pool,
  fn: (c: PoolClient) => Promise<T>,
  attempt = 0
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } catch (e: any) {
    const msg = String(e?.message || '');
    const code = e?.code as string | undefined;

    const retriable =
      (code && RETRIABLE_CODES.has(code)) ||
      /ECONNRESET|terminat|closed|db_termination|Connection terminated/i.test(msg);

    if (retriable && attempt < 2) {
      console.warn('[PG] transient error, retrying…', code || msg);
      await new Promise(r => setTimeout(r, 200 + attempt * 300));
      return run(pool, fn, attempt + 1);
    }
    throw e;
  } finally {
    client.release();
  }
}


export async function runGetOne<T>(
  pool: Pool,
  f: (c: PoolClient) => Promise<{ rows: any[] }>
) {
  const client = await pool.connect();
  try {
    const { rows } = await f(client);
    if (!rows.length) throw new Error('Query returned no rows');
    return rows[0] as T;
  } finally {
    client.release();
  }
}

export const run_ = <T>(pool: Pool, f: (c: PoolClient) => Promise<T>) =>
  run(pool, f).catch((err) => console.error('[run_]', err));

export function mkPool(connectionString: string, opts: PoolConfig = {}) {
  // Prefer a real CA when provided
  const ca =
    process.env.SUPABASE_SSL_CA ??
    (process.env.SUPABASE_SSL_CA_B64
      ? Buffer.from(process.env.SUPABASE_SSL_CA_B64, 'base64').toString('utf8')
      : undefined);

  const ssl =
    ca
      ? { ca, rejectUnauthorized: true }
      : { rejectUnauthorized: false }; // fallback for local/dev

  const cfg: PoolConfig = {
    connectionString,
    ssl,
    keepAlive: true,
    connectionTimeoutMillis: 300_000,
    idleTimeoutMillis: 600_000,
    ...opts,
  };

  const pool = new Pool(cfg);
  pool.on('error', (e) => console.error('[PG Pool] idle client error', e));
  return pool;
}


export async function runTx<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    c.release();
  }
}
