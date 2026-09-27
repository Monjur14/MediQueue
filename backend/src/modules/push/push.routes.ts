import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { pushController } from './push.controller.js';

const router = Router();

// Public: the browser needs the VAPID public key before it can subscribe
router.get('/public-key', pushController.getPublicKey);

// Any signed-in user can register the current browser for alerts
router.post('/subscriptions', authenticate, pushController.subscribe);
router.delete('/subscriptions', authenticate, pushController.unsubscribe);

export default router;
