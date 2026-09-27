import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// BullMQ needs its own Redis connection
// maxRetriesPerRequest must be null for BullMQ
export const bullmqConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const noShowQueue = new Queue('no-show', {
  connection: bullmqConnection,
});

export const pastDueQueue = new Queue('subscription-past-due', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false, // keep failed jobs visible for debugging
  },
});

export const cancelledQueue = new Queue('subscription-cancelled', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// "3 patients ahead" alerts: one job per queue movement, processed off the request path
export const pushQueue = new Queue('push-notifications', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

console.log('✅ BullMQ queues initialized');
