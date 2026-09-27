import type { Request, Response } from 'express';
import { billingService } from './billing.service.js';

export const billingController = {
  /** GET /api/billing/plans  — public */
  async getPlans(req: Request, res: Response) {
    try {
      const plans = await billingService.getPlans();
      res.json({ plans });
    } catch (err) {
      console.error('[billing] getPlans', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  /** GET /api/billing/subscription  — authenticated tenant */
  async getSubscription(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const subscription = await billingService.getSubscription(tenantId);
      res.json({ subscription });
    } catch (err) {
      console.error('[billing] getSubscription', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  /** POST /api/billing/checkout  — authenticated tenant */
  async createCheckout(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const { plan } = req.body as { plan?: string };
      if (!plan) {
        return res.status(400).json({ message: 'plan is required' });
      }
      const result = await billingService.createCheckoutSession(tenantId, plan);
      res.json(result);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.message === 'PLAN_NOT_FOUND') {
        return res.status(404).json({ message: 'Plan not found' });
      }
      console.error('[billing] createCheckout', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  /** POST /api/billing/portal  — authenticated tenant */
  async createPortal(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const result = await billingService.createPortalSession(tenantId);
      res.json(result);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.message === 'NO_SUBSCRIPTION') {
        return res.status(400).json({ message: 'No active subscription found' });
      }
      console.error('[billing] createPortal', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  /** POST /api/billing/webhook  — Stripe (raw body, no auth) */
  async webhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return res.status(400).json({ message: 'Missing stripe-signature' });
    }
    try {
      const result = await billingService.handleWebhook(req.body as Buffer, sig);
      res.json(result);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      console.error('[billing] webhook', err);
      res.status(e.status ?? 500).json({ message: e.message ?? 'Internal server error' });
    }
  },
};
