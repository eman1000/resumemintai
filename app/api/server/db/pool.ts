// app/api/server/db/pool.ts
import { Pool } from 'pg';

declare global { var _pgPool: Pool | undefined; }

let conn = process.env.DATABASE_URL!;
const u = new URL(conn);
u.searchParams.set('pgbouncer', 'true'); // idempotent
conn = u.toString();
if (!conn) throw new Error('SUPABASE_POOLED_URL is not set');

const isProd = process.env.NODE_ENV === 'production';

const pool =
  global._pgPool ??
  new Pool({
    connectionString: conn,
    max: 1,           // tiny, PgBouncer manages concurrency
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
    // PgBouncer transaction mode dislikes prepared statements
    // @ts-ignore
    preferSimpleProtocol: true,
    ssl: conn.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

if (!isProd) global._pgPool = pool;

pool.on('error', (e) => console.error('[PG pool idle client error]', e));

/** DEBUG: log once so you *know* you’re on 6543 */
(async () => {
  try {
    const { rows } = await pool.query("select inet_client_addr()::text host, inet_client_port()::int port, current_setting('application_name') app");
    console.log('[PG connected via]', rows[0]);
  } catch (e) {
    console.warn('[PG connect test error]', e);
  }
})();

export default pool;
