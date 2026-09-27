import express from 'express';
import { billingController } from './billing.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
/** Returns all plan tiers with prices */
router.get('/plans', billingController.getPlans);

/**
 * Stripe webhook — MUST be registered BEFORE express.json() parses the body.
 * We handle the raw buffer here; app.ts mounts this router before express.json().
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  billingController.webhook,
);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authenticate);

/** Get tenant's current subscription */
router.get('/subscription', billingController.getSubscription);

/** Create a Stripe Checkout Session → returns { url } */
router.post('/checkout', billingController.createCheckout);

/** Create a Stripe Customer Portal Session → returns { url } */
router.post('/portal', billingController.createPortal);

export default router;
