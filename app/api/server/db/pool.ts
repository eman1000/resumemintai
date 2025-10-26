// app/api/server/db/pool.ts
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const conn = process.env.SUPABASE_POOLED_URL;
if (!conn) {
  throw new Error('DATABASE_URL is not set. Put it in .env.local and restart.');
}

const pool =
  global._pgPool ??
  new Pool({
    connectionString: conn,
    max: 5,                     // small in dev
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
    ssl: conn.includes('localhost') || conn.includes('127.0.0.1')
      ? undefined                // local: usually no SSL
      : { rejectUnauthorized: false }, // hosted DBs often need SSL
  });

if (process.env.NODE_ENV !== 'production') global._pgPool = pool;

pool.on('error', (e) => console.error('[PG pool idle client error]', e));

export default pool;
