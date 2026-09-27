'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRequireAuth } from '@/hooks/useAuth';
import { useSubscription, useCreateCheckout, useCreatePortal } from '@/hooks/api/billing';
import { useSendSupportMessage } from '@/hooks/api/support';
import { cn } from '@/lib/utils';

/* ── helpers ──────────────────────────────────────────────────────── */
const PLAN_LABEL: Record<string, string> = {
  solo:     'Solo',
  clinic:   'Clinic',
  hospital: 'Hospital',
};

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  active:   { label: 'Active',    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pending:  { label: 'Pending payment', classes: 'bg-amber-50  text-amber-700  ring-amber-200' },
  past_due: { label: 'Past due',  classes: 'bg-red-50    text-red-700    ring-red-200' },
  cancelled:{ label: 'Cancelled', classes: 'bg-mq-ground text-mq-muted   ring-mq-line' },
  expired:  { label: 'Expired',   classes: 'bg-mq-ground text-mq-muted   ring-mq-line' },
};

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

/* ── component ────────────────────────────────────────────────────── */
export default function BillingPage() {
  const { user, loading } = useRequireAuth(['tenant_admin']);
  const { data: sub, isLoading } = useSubscription();
  const checkout = useCreateCheckout();
  const portal   = useCreatePortal();
  const sendMessage = useSendSupportMessage();
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  // Show alert from 402 paywall redirect
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem('billing_alert');
      if (msg) { toast.error(msg, { duration: 6000 }); sessionStorage.removeItem('billing_alert'); }
    } catch {}
  }, []);

  if (loading || !user) return null;

  const status    = sub?.status ?? 'pending';
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const isPending  = status === 'pending';
  const isActive   = status === 'active';
  const needsAction = !isActive;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <h1 className="text-2xl font-medium tracking-tight text-mq-ink md:text-3xl">Billing</h1>
      <p className="mt-1 text-sm text-mq-muted">Your plan and payment information.</p>

      {/* Main subscription card */}
      <div className="mt-8 rounded-2xl border border-mq-line bg-white overflow-hidden">

        {/* Plan header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-mq-line">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-mq-muted">Current plan</p>
            <p className="mt-1 text-2xl font-semibold text-mq-ink">
              {isLoading ? '—' : (PLAN_LABEL[sub?.plan_name ?? ''] ?? '—')}
            </p>
            {sub?.monthly_price && (
              <p className="mt-0.5 text-sm text-mq-muted">
                ${parseFloat(sub.monthly_price).toFixed(0)} / month
              </p>
            )}
          </div>
          <span className={cn(
            'mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset shrink-0',
            statusCfg.classes,
          )}>
            {statusCfg.label}
          </span>
        </div>

        {/* Subscription details grid */}
        <div className="grid grid-cols-1 divide-y divide-mq-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <DetailCell
            label="Last payment"
            value={isActive ? fmt(sub?.current_period_start) : '—'}
          />
          <DetailCell
            label="Next renewal"
            value={isActive && !sub?.cancel_at_period_end ? fmt(sub?.current_period_end) : '—'}
          />
          <DetailCell
            label="Subscription expires"
            value={
              isActive && sub?.cancel_at_period_end
                ? fmt(sub?.current_period_end)
                : isActive
                ? 'Auto-renews'
                : fmt(sub?.current_period_end)
            }
            muted={isActive && !sub?.cancel_at_period_end}
          />
        </div>

        {/* Action area */}
        <div className="px-6 py-5 bg-mq-ground border-t border-mq-line flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {needsAction ? (
            <>
              <p className="text-sm text-mq-muted">
                {isPending
                  ? 'Complete payment to activate your account and start using MediQueue.'
                  : status === 'past_due'
                  ? 'Your last payment failed. Update your payment method to avoid losing access.'
                  : 'Reactivate your subscription to regain full access.'}
              </p>
              <button
                type="button"
                onClick={() => checkout.mutate(sub?.plan_name ?? 'solo')}
                disabled={checkout.isPending}
                className="shrink-0 rounded-lg bg-mq-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-mq-ink/90 disabled:opacity-50"
              >
                {checkout.isPending ? 'Redirecting…' : isPending ? 'Pay now' : 'Reactivate'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-mq-muted">
                {sub?.cancel_at_period_end
                  ? `Your subscription will cancel on ${fmt(sub.current_period_end)}.`
                  : 'Manage your payment method, invoices, or cancel your subscription.'}
              </p>
              <button
                type="button"
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="shrink-0 rounded-lg border border-mq-line bg-white px-5 py-2.5 text-sm font-medium text-mq-ink transition hover:bg-mq-ground disabled:opacity-50"
              >
                {portal.isPending ? 'Opening…' : 'Manage billing'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Test mode notice */}
      <div className="mt-6 border border-mq-line bg-mq-ground px-6 py-4">
        <p className="text-sm text-mq-muted">
          <span className="font-medium text-mq-ink">Test mode.</span> Our payment system is
          currently running in test mode — no real charges are made. If you have already paid or
          need your account activated sooner, send us a message below.
        </p>
      </div>

      {/* Contact us */}
      <div className="mt-4 border border-mq-line bg-white">
        <div className="border-b border-mq-line px-6 py-4">
          <p className="text-sm font-medium text-mq-ink">Contact us</p>
          <p className="mt-1 text-sm text-mq-muted">
            Send us a message and we will activate your account.
          </p>
        </div>
        <form
          className="px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = note.trim();
            if (trimmed.length < 5) {
              toast.error('Please write a few more words so we know how to help.');
              return;
            }
            sendMessage.mutate(trimmed, {
              onSuccess: () => {
                setSent(true);
                setNote('');
                toast.success('Message sent. We will activate your account shortly.');
              },
              onError: () => toast.error('Could not send your message. Please try again.'),
            });
          }}
        >
          <label className="block text-sm text-mq-ink" htmlFor="support-message">
            Your message
          </label>
          <textarea
            id="support-message"
            value={note}
            onChange={(e) => { setNote(e.target.value); setSent(false); }}
            rows={4}
            placeholder="e.g. I want the Clinic plan and would like to pay — please let me know how, then activate my account."
            className="mt-2 w-full border border-mq-line bg-white px-3 py-2 text-sm text-mq-ink placeholder:text-mq-subtle focus:border-mq-ink focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-mq-subtle">
              {sent ? 'Message sent — we will get back to you soon.' : ''}
            </p>
            <button
              type="submit"
              disabled={sendMessage.isPending || note.trim().length < 5}
              className="shrink-0 border border-mq-ink bg-mq-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-mq-accent disabled:opacity-40"
            >
              {sendMessage.isPending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      </div>

      {/* Upgrade note */}
      {isActive && (
        <p className="mt-4 text-center text-xs text-mq-muted">
          Need more doctors or departments?{' '}
          <button
            type="button"
            onClick={() => portal.mutate()}
            className="underline underline-offset-2 hover:text-mq-ink transition-colors"
          >
            Contact support to upgrade
          </button>
        </p>
      )}
    </main>
  );
}

function DetailCell({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="px-6 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-mq-muted">{label}</p>
      <p className={cn('mt-1 text-sm font-medium', muted ? 'text-mq-muted' : 'text-mq-ink')}>{value}</p>
    </div>
  );
}
