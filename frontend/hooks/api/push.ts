/**
 * Web push API hooks: VAPID key + saving/removing this browser's subscription.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PushSubscriptionBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function usePushPublicKey(enabled: boolean) {
  return useQuery({
    queryKey: ['push', 'public-key'],
    queryFn: () => api.get<{ publicKey: string }>('/push/public-key').then((r) => r.data.publicKey),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}

export function useSavePushSubscription() {
  return useMutation({
    mutationFn: (body: PushSubscriptionBody) => api.post('/push/subscriptions', body),
  });
}

export function useDeletePushSubscription() {
  return useMutation({
    mutationFn: (endpoint: string) => api.delete('/push/subscriptions', { data: { endpoint } }),
  });
}
