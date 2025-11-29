import { Pool } from 'pg';

declare global { var _pgPool: Pool | undefined }

const conn = process.env.DATABASE_URL!;
if (!conn) throw new Error('NEON_POOLED_URL is not set');

const pool = global._pgPool ?? new Pool({
  connectionString: conn,
  max: 3,                         // small for serverless
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
});

if (process.env.NODE_ENV !== 'production') global._pgPool = pool;

pool.on('error', (e) => console.error('[PG pool idle client error]', e));

export default pool;
