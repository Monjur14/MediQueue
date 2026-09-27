import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // ── Connection pool tuning ─────────────────────────────────────────────────
  // max: how many simultaneous DB connections this Node process holds open.
  // Each request that calls pool.connect() occupies one slot for its lifetime.
  // PostgreSQL's own default max_connections is 100; leave headroom for
  // pgAdmin, migrations, and future replicas.
  max: 20,

  // Fail fast if no connection is available rather than hanging the request.
  // 5 s is long enough to absorb a brief spike; above this, return 503.
  connectionTimeoutMillis: 5_000,

  // Release idle connections after 30 s to avoid stale sockets.
  idleTimeoutMillis: 30_000,
});

pool.on('connect', () => {
  // Fires once per physical connection opened (not per query).
  // In production, suppress this or replace with a structured logger.
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Connected to PostgreSQL');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err);
  // Do NOT exit the process here in production — let the request fail
  // gracefully and let the pool reconnect automatically.
  if (process.env.NODE_ENV !== 'production') process.exit(1);
});
