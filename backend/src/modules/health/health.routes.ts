import { Router } from 'express';
import { pool }            from '../../config/database.js';
import { redis }           from '../../config/redis.js';
import { bullmqConnection } from '../../config/bullmq.js';

const router = Router();

// ── GET /health/live ──────────────────────────────────────────────────────────
// Is the process alive? No external checks — if this fails the process is dead.
// Used by: Docker HEALTHCHECK, uptime monitors, load balancer ping.
router.get('/live', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── GET /health/ready ─────────────────────────────────────────────────────────
// Are all dependencies reachable? Returns 503 when any check fails so the load
// balancer stops routing traffic to this instance until it recovers.
// Used by: Docker HEALTHCHECK (backend service), Kubernetes readinessProbe.
router.get('/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {
    postgres: 'error',
    redis:    'error',
    bullmq:   'error',
  };

  await Promise.allSettled([
    pool.query('SELECT 1').then(() => { checks['postgres'] = 'ok'; }),
    redis.ping()           .then(() => { checks['redis']    = 'ok'; }),
    bullmqConnection.ping().then(() => { checks['bullmq']   = 'ok'; }),
  ]);

  const allOk  = Object.values(checks).every(v => v === 'ok');
  const status = allOk ? 200 : 503;

  res.status(status).json({
    status: allOk ? 'ready' : 'degraded',
    checks,
  });
});

export default router;
