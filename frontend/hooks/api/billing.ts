/**
 * Billing hooks — plan listing, subscription info, checkout & portal
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────────── */
export interface SubscriptionPlan {
  id: number;
  name: 'solo' | 'clinic' | 'hospital';
  max_doctors: number | null;
  max_departments: number | null;
  max_daily_patients: number | null;
  monthly_price: string; // e.g. "20.00"
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: number;
  status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  // joined from subscription_plans
  plan_name: 'solo' | 'clinic' | 'hospital';
  monthly_price: string;
}

/* ── Queries ───────────────────────────────────────────────────── */
export function usePlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () =>
      api.get<{ plans: SubscriptionPlan[] }>('/billing/plans').then((r) => r.data.plans),
    staleTime: 10 * 60 * 1000, // plans rarely change
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () =>
      api.get<{ subscription: Subscription | null }>('/billing/subscription').then(
        (r) => r.data.subscription,
      ),
  });
}

/* ── Mutations ─────────────────────────────────────────────────── */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: (plan: string) =>
      api.post<{ url: string }>('/billing/checkout', { plan }).then((r) => r.data.url),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error('Failed to open checkout. Please try again.');
    },
  });
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: () =>
      api.post<{ url: string }>('/billing/portal').then((r) => r.data.url),
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast.error('Failed to open billing portal. Please try again.');
    },
  });
}
