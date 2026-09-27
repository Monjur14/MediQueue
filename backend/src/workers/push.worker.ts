import { Worker, type Job } from 'bullmq';
import { bullmqConnection, pushQueue } from '../config/bullmq.js';
import { pushService } from '../modules/push/push.service.js';

type NearTurnJob = { sessionId: string };

/**
 * Push worker — after any queue movement, alert patients who now have
 * NEAR_TURN_THRESHOLD (3) or fewer patients ahead. Each token is alerted once;
 * the claim in the repository makes duplicate jobs harmless.
 */
export const startPushWorker = () => {
  const worker = new Worker<NearTurnJob>(
    'push-notifications',
    async (job: Job<NearTurnJob>) => {
      await pushService.notifyNearTurn(job.data.sessionId);
    },
    { connection: bullmqConnection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    console.error(`❌ Push job ${job?.id} failed:`, err.message);
  });

  return worker;
};

/** Fire-and-forget: a Redis hiccup must never break the queue action that triggered it. */
export const enqueueNearTurnCheck = async (sessionId: string) => {
  try {
    await pushQueue.add('near-turn', { sessionId });
  } catch (err) {
    console.error('[push] failed to enqueue near-turn check', err);
  }
};
