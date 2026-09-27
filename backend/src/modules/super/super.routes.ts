import { Router } from 'express';
import { superController } from './super.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

// Every route here reads across all tenants — platform owner only.
router.use(authenticate, requireRole('super_admin'));

router.get('/overview',      superController.overview);
router.get('/tenants',       superController.tenants);
router.get('/subscriptions', superController.subscriptions);
router.get('/doctors',       superController.doctors);
router.get('/patients',      superController.patients);
router.get('/revenue',       superController.revenue);
router.get('/logs',          superController.logs);

export default router;
