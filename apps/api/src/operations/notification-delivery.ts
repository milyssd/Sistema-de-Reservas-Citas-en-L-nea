import { Notification, NotificationChannel, Prisma, PrismaClient } from '@prisma/client';
import pino from 'pino';
import { NotificationProvider, PushProvider, SmtpProvider } from './delivery';
const logger = pino({ name: 'notification-delivery' });
export type Providers = Partial<Record<NotificationChannel, NotificationProvider>>;
export type DeliveryOutcome = {
  state: 'sent' | 'skipped' | 'failed' | 'retry' | 'deferred';
  retryAt?: Date;
};
export function configuredProviders(db: PrismaClient): Providers {
  const providers: Providers = { IN_APP: { async send() {} }, EXPO_PUSH: new PushProvider(db) };
  if (process.env.SMTP_HOST && process.env.SMTP_FROM) providers.EMAIL = new SmtpProvider();
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
    providers.WEB_PUSH = new PushProvider(db);
  return providers;
}

/** MySQL owns claims and delivery records; Redis may be lost without losing the outbox. */
export class NotificationDelivery {
  readonly channels: NotificationChannel[];
  readonly leaseMs: number;
  readonly backoffMs: number;
  constructor(
    private readonly db: PrismaClient,
    private readonly providers: Providers = configuredProviders(db),
    options: { leaseMs?: number; backoffMs?: number } = {},
  ) {
    this.channels = Object.keys(providers) as NotificationChannel[];
    this.leaseMs = options.leaseMs ?? 5 * 60000;
    this.backoffMs = options.backoffMs ?? 30000;
  }
  async eligible(businessId?: string, limit = 100): Promise<Notification[]> {
    if (!this.channels.length) return [];
    const now = new Date();
    return this.db.notification.findMany({
      where: {
        businessId,
        channel: { in: this.channels },
        OR: [
          { status: 'PENDING', scheduledAt: { lte: now } },
          { status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - this.leaseMs) } },
        ],
      },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }
  async deliver(id: string, businessId: string): Promise<DeliveryOutcome> {
    const claim = await this.db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM Notification WHERE id = ${id} AND businessId = ${businessId} FOR UPDATE SKIP LOCKED`;
        if (!rows.length) return { outcome: { state: 'skipped' as const } };
        const row = await tx.notification.findUniqueOrThrow({ where: { id } });
        if (!this.providers[row.channel] || row.status === 'SENT' || row.status === 'FAILED')
          return { outcome: { state: 'skipped' as const } };
        const retryAt =
          row.status === 'PROCESSING' && row.lockedAt
            ? new Date(row.lockedAt.getTime() + this.leaseMs)
            : row.scheduledAt;
        if (retryAt > new Date()) return { outcome: { state: 'deferred' as const, retryAt } };
        if (row.attempts >= row.maxAttempts) {
          await tx.notification.update({
            where: { id },
            data: { status: 'FAILED', lockedAt: null, lastError: 'DELIVERY_ATTEMPTS_EXHAUSTED' },
          });
          return { outcome: { state: 'failed' as const } };
        }
        return {
          job: await tx.notification.update({
            where: { id },
            data: { status: 'PROCESSING', lockedAt: new Date(), attempts: { increment: 1 } },
          }),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    if ('outcome' in claim && claim.outcome) return claim.outcome;
    const job = claim.job!;
    const currentClaim = {
      id: job.id,
      businessId: job.businessId,
      status: 'PROCESSING' as const,
      attempts: job.attempts,
    };
    const heartbeat = setInterval(
      () => {
        void this.db.notification
          .updateMany({ where: currentClaim, data: { lockedAt: new Date() } })
          .catch(() => logger.warn({ jobId: id }, 'Delivery lease heartbeat failed'));
      },
      Math.max(100, Math.floor(this.leaseMs / 3)),
    );
    heartbeat.unref();
    try {
      await this.providers[job.channel]!.send(job);
      await this.db.$transaction(async (tx) => {
        const result = await tx.notification.updateMany({
          where: currentClaim,
          data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lastError: null },
        });
        const reminderId = (job.payload as { reminderId?: string } | null)?.reminderId;
        if (result.count && reminderId)
          await tx.reminder.updateMany({
            where: { id: reminderId, businessId },
            data: { status: 'SENT', sentAt: new Date(), lastError: null },
          });
      });
      return { state: 'sent' };
    } catch (error) {
      const permanent = job.attempts >= job.maxAttempts;
      const retryAt = new Date(
        Date.now() + Math.min(3600000, this.backoffMs * 2 ** (job.attempts - 1)),
      );
      await this.db.$transaction(async (tx) => {
        const result = await tx.notification.updateMany({
          where: currentClaim,
          data: {
            status: permanent ? 'FAILED' : 'PENDING',
            lockedAt: null,
            lastError: 'DELIVERY_FAILED',
            scheduledAt: retryAt,
          },
        });
        const reminderId = (job.payload as { reminderId?: string } | null)?.reminderId;
        if (result.count && permanent && reminderId)
          await tx.reminder.updateMany({
            where: { id: reminderId, businessId, status: 'PROCESSING' },
            data: { status: 'FAILED', lastError: 'DELIVERY_FAILED' },
          });
      });
      logger.warn(
        {
          jobId: id,
          channel: job.channel,
          permanent,
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
        'Notification delivery failed',
      );
      return { state: permanent ? 'failed' : 'retry', retryAt };
    } finally {
      clearInterval(heartbeat);
    }
  }
  async drain(businessId?: string): Promise<number> {
    let processed = 0;
    for (const job of await this.eligible(businessId, 25))
      if ((await this.deliver(job.id, job.businessId)).state === 'sent') processed++;
    return processed;
  }
}
