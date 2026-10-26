import 'reflect-metadata';
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import pino from 'pino';
import { PrismaService } from '../common/prisma.service';
import { enqueueBookingNotifications, notifyWaitlist } from './notifications';
import cron from 'node-cron';
import { NotificationDelivery } from './notification-delivery';
import { createNotificationQueue, dispatchOutbox } from './notification-queue';

const logger = pino({ name: 'reservas-worker' });

/** Durable, at-least-once queue. Claims are serialized in MySQL, including across workers. */
export async function maintainOutbox(db: PrismaClient, businessId?: string) {
  const now = new Date();
  await db.hold.deleteMany({ where: { businessId, expiresAt: { lte: now } } });
  await db.idempotencyRecord.deleteMany({ where: { businessId, expiresAt: { lte: now } } });
  const expired = await db.booking.findMany({
    where: { businessId, status: 'PENDING', expiresAt: { lte: now } },
    select: { id: true, businessId: true, staffId: true, items: { select: { staffId: true } } },
    take: 100,
  });
  for (const candidate of expired)
    await db.$transaction(
      async (tx) => {
        // Keep lock order consistent with booking mutations: staff, then booking.
        const staffIds = [
          ...new Set([candidate.staffId, ...candidate.items.map((item) => item.staffId)]),
        ].sort();
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM Staff WHERE businessId = ${candidate.businessId} AND id IN (${Prisma.join(staffIds)}) ORDER BY id FOR UPDATE`,
        );
        await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${candidate.id} AND businessId = ${candidate.businessId} FOR UPDATE`;
        const currentItems = await tx.bookingItem.findMany({
          where: { bookingId: candidate.id, businessId: candidate.businessId },
          select: { staffId: true },
        });
        if (currentItems.some((item) => !staffIds.includes(item.staffId))) return;
        const result = await tx.booking.updateMany({
          where: {
            id: candidate.id,
            businessId: candidate.businessId,
            status: 'PENDING',
            expiresAt: { lte: now },
          },
          data: { status: 'EXPIRED', version: { increment: 1 } },
        });
        if (!result.count) return;
        await tx.slotClaim.deleteMany({
          where: { businessId: candidate.businessId, bookingId: candidate.id },
        });
        await tx.reminder.updateMany({
          where: { businessId: candidate.businessId, bookingId: candidate.id, status: 'PENDING' },
          data: { status: 'FAILED', lastError: 'BOOKING_EXPIRED' },
        });
        await enqueueBookingNotifications(tx, candidate.id, 'BOOKING_EXPIRED');
        await notifyWaitlist(tx, candidate.id);
        await tx.auditLog.create({
          data: {
            businessId: candidate.businessId,
            action: 'BOOKING_EXPIRED',
            entityType: 'Booking',
            entityId: candidate.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

  const reminders = await db.reminder.findMany({
    where: { businessId, status: 'PENDING', scheduledAt: { lte: now } },
    take: 100,
  });
  for (const reminder of reminders)
    await db.$transaction(async (tx) => {
      const claimed = await tx.reminder.updateMany({
        where: { id: reminder.id, status: 'PENDING' },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });
      if (!claimed.count) return;
      const booking = await tx.booking.findUnique({ where: { id: reminder.bookingId } });
      if (!booking || booking.status !== 'CONFIRMED' || booking.startAt <= now) {
        await tx.reminder.update({
          where: { id: reminder.id },
          data: { status: 'FAILED', lastError: 'BOOKING_INACTIVE' },
        });
        return;
      }
      await enqueueBookingNotifications(tx, booking.id, 'BOOKING_REMINDER', reminder.id);
    });

  const duePayments = await db.booking.findMany({
    where: {
      businessId,
      status: 'PENDING',
      depositAmount: { gt: 0 },
      expiresAt: { gt: now, lte: new Date(now.getTime() + 2 * 3600000) },
    },
    take: 100,
  });
  for (const booking of duePayments)
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${booking.id} FOR UPDATE`;
      const already = await tx.notification.findFirst({
        where: {
          businessId: booking.businessId,
          event: 'PAYMENT_DUE',
          payload: { path: '$.bookingId', equals: booking.id },
        },
      });
      if (!already) await enqueueBookingNotifications(tx, booking.id, 'PAYMENT_DUE');
    });

  return { expired: expired.length };
}

export async function runTick(db: PrismaClient, businessId?: string) {
  const maintenance = await maintainOutbox(db, businessId);
  const processed = await new NotificationDelivery(db).drain(businessId);
  return { ...maintenance, processed };
}

export function scheduleNotificationTick(tick: () => Promise<void>, expression = '*/30 * * * * *') {
  return cron.schedule(expression, tick, { noOverlap: true });
}

export async function runWorker() {
  const db = new PrismaService();
  await db.$connect();
  if (process.argv.includes('--once')) {
    try {
      const { delivery, queue } = createNotificationQueue(db);
      try {
        await queue.start();
        const maintenance = await maintainOutbox(db);
        const dispatched = await dispatchOutbox(delivery, queue);
        logger.info(
          {
            ...maintenance,
            dispatched,
            backend: process.env.REDIS_URL ? 'bullmq' : 'database-cron',
          },
          'Worker tick completed',
        );
      } finally {
        await queue.close();
      }
    } finally {
      await db.$disconnect();
    }
    return;
  }
  const { delivery, queue } = createNotificationQueue(db);
  await queue.start();
  let active: Promise<void> | undefined;
  const tick = () => {
    if (active) return active;
    active = (async () => {
      await maintainOutbox(db);
      await dispatchOutbox(delivery, queue);
    })()
      .catch((error) => {
        logger.error(
          { errorType: error instanceof Error ? error.name : 'Unknown' },
          'Worker tick failed; durable outbox will retry',
        );
      })
      .finally(() => {
        active = undefined;
      });
    return active;
  };
  logger.info(
    {
      backend: process.env.REDIS_URL ? 'bullmq' : 'database-cron',
      smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    },
    'Notification worker started',
  );
  await tick();
  const schedule = scheduleNotificationTick(tick);
  await new Promise<void>((resolve) => {
    process.once('SIGTERM', resolve);
    process.once('SIGINT', resolve);
  });
  await schedule.stop();
  await schedule.destroy();
  if (active) await active;
  await queue.close();
  await db.$disconnect();
}

if (require.main === module)
  runWorker().catch(() => {
    logger.fatal('Worker startup failed');
    process.exitCode = 1;
  });
