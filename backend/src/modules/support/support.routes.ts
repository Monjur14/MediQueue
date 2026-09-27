import { Router } from 'express';
import { supportController } from './support.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

// ✅ public — homepage "Contact us" form, no auth
router.post('/contact', supportController.createInquiry);

router.use(authenticate);

// 🔒 tenant_admin — send a message from the Billing page
router.post('/messages', requireRole('tenant_admin'), supportController.create);

// 🔒 super_admin — read and resolve messages from the platform console
router.get('/messages',            requireRole('super_admin'), supportController.list);
router.put('/messages/:id/resolve', requireRole('super_admin'), supportController.resolve);

// 🔒 super_admin — read and resolve homepage contact inquiries
router.get('/contact',             requireRole('super_admin'), supportController.listInquiries);
router.put('/contact/:id/resolve', requireRole('super_admin'), supportController.resolveInquiry);

export default router;
