import { Router } from 'express';
import { trackingController } from './tracking.controller.js';

const router = Router();

// Public — the global rate limiter (100 req/min per IP) protects it from floods.
router.post('/', trackingController.track);

export default router;
