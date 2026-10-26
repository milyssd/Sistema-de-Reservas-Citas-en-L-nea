import { Notification, PrismaClient } from '@prisma/client';
import { DelayedError, Queue, UnrecoverableError, Worker } from 'bullmq';
import pino from 'pino';
import type { RedisOptions } from 'ioredis';
import { NotificationDelivery } from './notification-delivery';
const logger = pino({ name: 'notification-queue' });
export interface NotificationQueue {
  start(): Promise<void>;
  enqueue(notification: Notification): Promise<void>;
  close(): Promise<void>;
}
export class DatabaseNotificationQueue implements NotificationQueue {
  constructor(private readonly delivery: NotificationDelivery) {}
  async start() {}
  async enqueue(notification: Notification) {
    await this.delivery.deliver(notification.id, notification.businessId);
  }
  async close() {}
}
export function redisOptions(urlValue: string): RedisOptions {
  const url = new URL(urlValue);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('INVALID_REDIS_URL');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.slice(1) || 0),
    ...(url.protocol === 'rediss:' ? { tls: { servername: url.hostname } } : {}),
  };
}
/** BullMQ only carries UUIDs. Sensitive notification contents stay in MySQL. */
export class BullMqNotificationQueue implements NotificationQueue {
  private readonly queue: Queue<{ notificationId: string; businessId: string }>;
  private worker?: Worker;
  private readonly connection: RedisOptions;
  private readonly queueName: string;
  private readonly prefix: string;
  constructor(
    private readonly delivery: NotificationDelivery,
    redisUrl: string,
    options: { queueName?: string; prefix?: string; concurrency?: number } = {},
  ) {
    this.connection = redisOptions(redisUrl);
    this.queueName = options.queueName ?? 'notifications';
    this.prefix = options.prefix ?? process.env.QUEUE_PREFIX ?? 'reservas';
    this.concurrency = options.concurrency ?? 4;
    this.queue = new Queue(this.queueName, {
      connection: { ...this.connection, maxRetriesPerRequest: 1 },
      prefix: this.prefix,
    });
    this.queue.on('error', () =>
      logger.warn('Redis queue connection error; MySQL outbox remains durable'),
    );
  }
  private readonly concurrency: number;
  async start() {
    await this.queue.waitUntilReady();
    this.worker = new Worker(
      this.queueName,
      async (job, token) => {
        const result = await this.delivery.deliver(job.data.notificationId, job.data.businessId);
        if (result.state === 'deferred' && result.retryAt) {
          await job.moveToDelayed(result.retryAt.getTime(), token);
          throw new DelayedError();
        }
        if (result.state === 'retry') throw new Error('DELIVERY_RETRY');
        if (result.state === 'failed') throw new UnrecoverableError('DELIVERY_ATTEMPTS_EXHAUSTED');
        return { state: result.state };
      },
      {
        connection: { ...this.connection, maxRetriesPerRequest: null },
        prefix: this.prefix,
        concurrency: this.concurrency,
        lockDuration: this.delivery.leaseMs,
        stalledInterval: Math.min(30000, this.delivery.leaseMs),
        maxStalledCount: 2,
      },
    );
    this.worker.on('error', () => logger.warn('Redis worker connection error'));
    this.worker.on('failed', (job) =>
      logger.warn(
        { jobId: job?.id },
        'Queue delivery attempt failed; MySQL records the retry state',
      ),
    );
    await this.worker.waitUntilReady();
  }
  async enqueue(notification: Notification) {
    const existing = await this.queue.getJob(notification.id);
    if (existing) {
      const state = await existing.getState();
      if (!['completed', 'failed'].includes(state)) return;
      // Manual retry or recovery after a lost claim: remove only finished BullMQ jobs.
      try {
        await existing.remove();
      } catch {
        return;
      }
    }
    await this.queue.add(
      'deliver',
      { notificationId: notification.id, businessId: notification.businessId },
      {
        jobId: notification.id,
        attempts: notification.maxAttempts,
        backoff: { type: 'exponential', delay: this.delivery.backoffMs },
        removeOnComplete: { age: 86400, count: 10000 },
        removeOnFail: { age: 7 * 86400, count: 10000 },
      },
    );
  }
  async close() {
    if (this.worker) await this.worker.close();
    await this.queue.close();
  }
}
export async function dispatchOutbox(
  delivery: NotificationDelivery,
  queue: NotificationQueue,
  businessId?: string,
) {
  const jobs = await delivery.eligible(businessId);
  for (const job of jobs) await queue.enqueue(job);
  return jobs.length;
}
export function createNotificationQueue(db: PrismaClient, redisUrl = process.env.REDIS_URL) {
  const delivery = new NotificationDelivery(db);
  return {
    delivery,
    queue: redisUrl
      ? new BullMqNotificationQueue(delivery, redisUrl)
      : new DatabaseNotificationQueue(delivery),
  };
}
