import type { PoolClient } from 'pg';
import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

/**
 * Acquires a DB client for the duration of the request and sets the three
 * PostgreSQL session variables that RLS policies read:
 *
 *   app.current_tenant_id   — scopes all tenant-isolated tables
 *   app.current_user_id     — lets the patient row policy pass
 *   app.current_user_role   — lets super_admin bypass RLS
 *
 * The client is stored on `req.dbClient` so route handlers and repositories
 * can reuse the SAME connection (and therefore the SAME RLS context).
 * It is released once — on whichever of 'finish' or 'close' fires first.
 *
 * Without this, pool.query() inside a repository may get a DIFFERENT
 * connection from the pool that has no RLS context set.
 */
export const resolveTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Kept as a let so the catch block can release if connect() itself throws
  // after partially running (rare, but safe).
  let client: PoolClient | null = null;

  try {
    // Use a const so TypeScript can narrow the type cleanly without
    // being confused by the mutable `client` variable captured in closures.
    const c = await pool.connect();
    client = c;

    // Attach to the request so repositories can use it
    (req as any).dbClient = c;

    if (req.user) {
      await c.query(
        `SELECT
          set_config('app.current_tenant_id', $1, TRUE),
          set_config('app.current_user_id',   $2, TRUE),
          set_config('app.current_user_role',  $3, TRUE)`,
        [req.user.tenantId ?? '', req.user.id, req.user.role],
      );
    }

    // 'finish' fires after response is sent; 'close' fires on aborted requests.
    // Both can fire on a normal request, so guard with a flag to release exactly once.
    let released = false;
    const releaseOnce = () => {
      if (!released) {
        released = true;
        c.release();
      }
    };

    res.on('finish', releaseOnce);
    res.on('close',  releaseOnce);

    next();
  } catch (err) {
    console.error('resolveTenant error:', err);
    client?.release();
    next();   // don't block the request; downstream will fail on its own query
  }
};
