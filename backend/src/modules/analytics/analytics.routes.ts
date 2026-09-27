import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.get(
  '/summary',
  authenticate,
  requireRole('tenant_admin'),
  analyticsController.getSummary
);

export default router;
