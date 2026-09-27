import { pushEnabled, vapidPublicKey, webpush } from '../../config/webpush.js';
import { pushRepository, type NearTurnToken } from './push.repository.js';
import type { SubscribeInput } from './push.schema.js';

/** Alert a patient once, when this many (or fewer) patients are waiting ahead of them. */
export const NEAR_TURN_THRESHOLD = 3;

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

type WebPushError = { statusCode?: number };

function isGone(err: unknown): boolean {
  const code = (err as WebPushError | null)?.statusCode;
  return code === 404 || code === 410;
}

export function nearTurnPayload(token: NearTurnToken): PushPayload {
  const title =
    token.ahead === 0
      ? "You're next"
      : `${token.ahead} ${token.ahead === 1 ? 'patient' : 'patients'} ahead of you`;
  return {
    title,
    body: `Token #${token.token_number} with ${token.doctor_name} at ${token.clinic_name}. Please head back to the waiting area.`,
    url: '/queue',
    tag: `near-turn-${token.id}`,
  };
}

export const pushService = {
  getPublicKey() {
    if (!pushEnabled) throw new Error('PUSH_DISABLED');
    return vapidPublicKey;
  },

  async subscribe(userId: string, input: SubscribeInput, userAgent: string | null) {
    if (!pushEnabled) throw new Error('PUSH_DISABLED');
    await pushRepository.upsertSubscription(userId, input.endpoint, input.keys.p256dh, input.keys.auth, userAgent);
  },

  async unsubscribe(userId: string, endpoint: string) {
    await pushRepository.deleteSubscription(userId, endpoint);
  },

  /** Sends to every device the user subscribed; prunes subscriptions the push service says are gone. */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!pushEnabled) return 0;
    const subs = await pushRepository.getByUser(userId);
    const body = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 15 * 60, urgency: 'high' },
          );
          await pushRepository.markUsed(sub.endpoint);
        } catch (err) {
          if (isGone(err)) await pushRepository.deleteByEndpoint(sub.endpoint);
          throw err;
        }
      }),
    );
    return results.filter((r) => r.status === 'fulfilled').length;
  },

  /** Called by the push worker after every queue movement in a session. */
  async notifyNearTurn(sessionId: string) {
    if (!pushEnabled) return;
    const tokens = await pushRepository.claimNearTurnTokens(sessionId, NEAR_TURN_THRESHOLD);
    await Promise.allSettled(tokens.map((t) => pushService.sendToUser(t.patient_id, nearTurnPayload(t))));
  },
};
