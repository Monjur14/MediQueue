import Stripe from 'stripe';
import { billingRepository } from './billing.repository.js';
import {
  schedulePastDueExpiry,
  cancelPastDueExpiry,
} from '../../workers/pastDue.worker.js';
import {
  scheduleCancelledLock,
  cancelCancelledLock,
} from '../../workers/cancelled.worker.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-08-26.dahlia',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const billingService = {
  async getPlans() {
    return billingRepository.getAllPlans();
  },

  async getSubscription(tenantId: string) {
    return billingRepository.getSubscriptionByTenant(tenantId);
  },

  /** Create a Stripe Checkout Session for a new/upgrade subscription */
  async createCheckoutSession(tenantId: string, planName: string) {
    const plan = await billingRepository.getPlanByName(planName);
    if (!plan) throw Object.assign(new Error('PLAN_NOT_FOUND'), { status: 404 });

    const existing = await billingRepository.getSubscriptionByTenant(tenantId);

    // Resolve or create Stripe customer
    let customerId = existing?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const email = await billingRepository.getTenantEmail(tenantId);
      const customer = await stripe.customers.create({
        ...(email != null ? { email } : {}),
        metadata: { tenant_id: tenantId },
      });
      customerId = customer.id;
    }

    // Stripe expects price in cents — monthly_price is stored as NUMERIC(10,2)
    const unitAmount = Math.round(parseFloat(plan.monthly_price) * 100);

    // Inline price — works great for test mode without a pre-created Price object
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            recurring: { interval: 'month' },
            product_data: {
              name: `MediQueue ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} Plan`,
              description: buildPlanDescription(plan),
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenant_id: tenantId,
        plan_id:   String(plan.id),
        plan_name: plan.name,
      },
      success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/billing`,
    });

    return { url: session.url! };
  },

  /** Create a Stripe Customer Portal session for managing/cancelling */
  async createPortalSession(tenantId: string) {
    const sub = await billingRepository.getSubscriptionByTenant(tenantId);
    if (!sub?.stripe_customer_id) {
      throw Object.assign(new Error('NO_SUBSCRIPTION'), { status: 400 });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${APP_URL}/billing`,
    });
    return { url: session.url };
  },

  /** Handle raw Stripe webhook — call ONLY from the webhook endpoint */
  async handleWebhook(rawBody: Buffer, sig: string) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook signature error';
      throw Object.assign(new Error(msg), { status: 400 });
    }

    // ── Idempotency check ──────────────────────────────────────────────────
    // Stripe retries webhooks on any non-2xx response. Guard all downstream
    // side-effects by checking whether we already processed this event ID.
    const alreadyProcessed = await billingRepository.isEventProcessed(event.id);
    if (alreadyProcessed) {
      return { received: true, duplicate: true };
    }

    await handleStripeEvent(event);

    // Mark AFTER successful processing so a crash mid-handler retries cleanly.
    await billingRepository.markEventProcessed(event.id, event.type);

    return { received: true };
  },
};

// ─── Private helpers ────────────────────────────────────────────────────────

function buildPlanDescription(plan: { max_doctors?: number | null; max_departments?: number | null }) {
  const parts: string[] = [];
  if (plan.max_doctors) parts.push(`${plan.max_doctors} doctors`);
  if (plan.max_departments) parts.push(`${plan.max_departments} departments`);
  return parts.join(' · ') || 'MediQueue Subscription';
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') break;

      const tenantId  = session.metadata?.tenant_id;
      const planId    = Number(session.metadata?.plan_id);
      const stripeSubId = session.subscription as string;
      const customerId  = session.customer as string;

      if (!tenantId || !planId || !stripeSubId) break;

      // Fetch full subscription to get period dates
      // NOTE: In Stripe API 2026-08-26.dahlia, current_period_start/end moved to
      //       subscription items (items.data[0]), not the subscription root.
      const stripeSub = await stripeClient().subscriptions.retrieve(stripeSubId);
      const item = stripeSub.items.data[0];
      await billingRepository.upsertSubscription({
        tenant_id:             tenantId,
        plan_id:               planId,
        status:                'active',
        stripe_customer_id:    customerId,
        stripe_subscription_id: stripeSubId,
        current_period_start:  new Date((item?.current_period_start ?? stripeSub.billing_cycle_anchor) * 1000),
        current_period_end:    new Date((item?.current_period_end   ?? (stripeSub.billing_cycle_anchor + 30 * 24 * 3600)) * 1000),
        cancel_at_period_end:  stripeSub.cancel_at_period_end,
      });
      // Activate the tenant admin user (moves them from pending_payment → active)
      await billingRepository.activateTenantAdmin(tenantId);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const status = mapStripeStatus(sub.status);
      const subItem = sub.items.data[0];
      const periodEnd = new Date((subItem?.current_period_end ?? (sub.billing_cycle_anchor + 30 * 24 * 3600)) * 1000);
      await billingRepository.updateSubscriptionStatus(sub.id, status, {
        current_period_start: new Date((subItem?.current_period_start ?? sub.billing_cycle_anchor) * 1000),
        current_period_end:   periodEnd,
        cancel_at_period_end: sub.cancel_at_period_end,
        cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      });
      // Tenant scheduled a cancellation — lock their account at period end
      if (sub.cancel_at_period_end) {
        const dbSub = await billingRepository.getSubscriptionByStripeId(sub.id);
        if (dbSub) {
          await scheduleCancelledLock({
            tenantId:       dbSub.tenant_id,
            subscriptionId: dbSub.id,
            periodEnd:      periodEnd.toISOString(),
          });
        }
      } else {
        // Tenant reversed their cancellation — remove pending lock job
        await cancelCancelledLock(sub.id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await billingRepository.updateSubscriptionStatus(sub.id, 'cancelled', {
        cancelled_at: new Date(),
      });
      // Schedule immediate lock (delay: 0 — fires on next worker tick)
      const dbSub = await billingRepository.getSubscriptionByStripeId(sub.id);
      if (dbSub) {
        await scheduleCancelledLock({
          tenantId:       dbSub.tenant_id,
          subscriptionId: dbSub.id,
          periodEnd:      new Date().toISOString(), // period already over
        });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      // Cast to any: Stripe dahlia API moved subscription off Invoice root type
      const inv = event.data.object as any;
      const subId: string | undefined =
        typeof inv.subscription === 'string'
          ? (inv.subscription as string)
          : (inv.subscription as Stripe.Subscription | null)?.id ?? undefined;
      if (subId) {
        await billingRepository.updateSubscriptionStatus(subId, 'active');
        // Cancel any pending grace-period expiry — tenant paid in time
        await cancelPastDueExpiry(subId);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as any;
      const subId: string | undefined =
        typeof inv.subscription === 'string'
          ? (inv.subscription as string)
          : (inv.subscription as Stripe.Subscription | null)?.id ?? undefined;
      if (subId) {
        await billingRepository.updateSubscriptionStatus(subId, 'past_due');
        // Schedule grace-period expiry — tenant has 7 days to pay before lock
        const sub = await billingRepository.getSubscriptionByStripeId(subId);
        if (sub) {
          await schedulePastDueExpiry({
            tenantId:             sub.tenant_id,
            subscriptionId:       sub.id,
            stripeSubscriptionId: subId,
          });
        }
      }
      break;
    }

    default:
      // unhandled event — ignore silently
      break;
  }
}

function stripeClient() {
  return stripe;
}

function mapStripeStatus(s: Stripe.Subscription.Status): 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending' {
  switch (s) {
    case 'active':   return 'active';
    case 'past_due': return 'past_due';
    case 'canceled': return 'cancelled';
    case 'unpaid':   return 'expired';
    default:         return 'pending';
  }
}
