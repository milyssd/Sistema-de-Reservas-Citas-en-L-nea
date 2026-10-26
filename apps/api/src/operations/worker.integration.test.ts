import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../common/prisma.service';
import { randomUUID } from 'node:crypto';
import { runTick } from './worker';
const dbDescribe = process.env.DATABASE_URL ? describe : describe.skip;
dbDescribe('Durable worker using MySQL', () => {
  let db: PrismaService;
  let businessId: string, expiredBookingId: string, confirmedBookingId: string, reminderId: string;
  let savedSmtp: string | undefined, savedVapid: string | undefined;
  beforeAll(async () => {
    db = new PrismaService();
    savedSmtp = process.env.SMTP_HOST;
    savedVapid = process.env.VAPID_PUBLIC_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.VAPID_PUBLIC_KEY;
    const suffix = randomUUID();
    businessId = (
      await db.business.create({ data: { name: 'Worker test', slug: `worker-${suffix}` } })
    ).id;
    const location = await db.location.create({
      data: { businessId, name: 'Sede test', address: 'Test' },
    });
    const staff = await db.staff.create({
      data: { businessId, locationId: location.id, name: 'Personal test' },
    });
    const service = await db.service.create({
      data: { businessId, name: 'Servicio test', durationMinutes: 30, price: 50 },
    });
    const customer = await db.customer.create({
      data: {
        businessId,
        name: 'Cliente test',
        email: 'worker@example.test',
        phone: '+59170123456',
      },
    });
    const startAt = new Date(Date.now() + 48 * 3600000),
      endAt = new Date(startAt.getTime() + 1800000);
    const base = {
      businessId,
      locationId: location.id,
      customerId: customer.id,
      staffId: staff.id,
      startAt,
      endAt,
      totalAmount: 50,
      depositAmount: 10,
    };
    expiredBookingId = (
      await db.booking.create({
        data: {
          ...base,
          code: randomUUID().replaceAll('-', '').slice(0, 8),
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 1000),
        },
      })
    ).id;
    confirmedBookingId = (
      await db.booking.create({
        data: {
          ...base,
          startAt: new Date(startAt.getTime() + 3600000),
          endAt: new Date(endAt.getTime() + 3600000),
          code: randomUUID().replaceAll('-', '').slice(0, 8),
          status: 'CONFIRMED',
        },
      })
    ).id;
    for (const bookingId of [expiredBookingId, confirmedBookingId])
      await db.bookingItem.create({
        data: {
          businessId,
          bookingId,
          serviceId: service.id,
          staffId: staff.id,
          serviceName: 'Servicio test',
          durationMinutes: 30,
          price: 50,
          startAt,
          endAt,
        },
      });
    await db.slotClaim.create({
      data: {
        businessId,
        staffId: staff.id,
        bookingId: expiredBookingId,
        minute: startAt,
        seat: 0,
      },
    });
    await db.hold.create({
      data: {
        businessId,
        staffId: staff.id,
        locationId: location.id,
        serviceId: service.id,
        tokenHash: 'a'.repeat(64),
        startAt,
        endAt,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    reminderId = (
      await db.reminder.create({
        data: {
          businessId,
          bookingId: confirmedBookingId,
          scheduledAt: new Date(Date.now() - 1000),
        },
      })
    ).id;
    await db.waitlistEntry.create({
      data: {
        businessId,
        customerId: customer.id,
        serviceId: service.id,
        locationId: location.id,
        from: startAt,
        to: endAt,
      },
    });
  });
  afterAll(async () => {
    if (savedSmtp === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = savedSmtp;
    if (savedVapid === undefined) delete process.env.VAPID_PUBLIC_KEY;
    else process.env.VAPID_PUBLIC_KEY = savedVapid;
    if (businessId) {
      await db.notification.deleteMany({ where: { businessId } });
      await db.auditLog.deleteMany({ where: { businessId } });
      await db.waitlistEntry.deleteMany({ where: { businessId } });
      await db.hold.deleteMany({ where: { businessId } });
      await db.booking.deleteMany({ where: { businessId } });
      await db.service.deleteMany({ where: { businessId } });
      await db.staff.deleteMany({ where: { businessId } });
      await db.customer.deleteMany({ where: { businessId } });
      await db.location.deleteMany({ where: { businessId } });
      await db.business.deleteMany({ where: { id: businessId } });
    }
    if (db) await db.$disconnect();
  });
  it('expires pending appointments, releases slot claims, cleans holds and queues waitlist notifications', async () => {
    await runTick(db, businessId);
    expect((await db.booking.findUniqueOrThrow({ where: { id: expiredBookingId } })).status).toBe(
      'EXPIRED',
    );
    expect(await db.slotClaim.count({ where: { businessId } })).toBe(0);
    expect(await db.hold.count({ where: { businessId } })).toBe(0);
    expect(
      await db.notification.count({
        where: { businessId, event: 'WAITLIST_AVAILABLE', status: 'PENDING' },
      }),
    ).toBe(1);
  });
  it('queues due reminders without falsely marking unconfigured email as sent, and repeats safely', async () => {
    await runTick(db, businessId);
    const reminders = await db.notification.findMany({
      where: { businessId, event: 'BOOKING_REMINDER' },
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].status).toBe('PENDING');
    expect(reminders[0].attempts).toBe(0);
    expect((await db.reminder.findUniqueOrThrow({ where: { id: reminderId } })).status).toBe(
      'PROCESSING',
    );
    expect(await db.notification.count({ where: { businessId, event: 'BOOKING_EXPIRED' } })).toBe(
      1,
    );
  });
});
