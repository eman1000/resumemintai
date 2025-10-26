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

export async function run<T>(pool: Pool, f: (c: PoolClient) => Promise<any>) {
  const client = await pool.connect();
  try {
    return await f(client);
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
