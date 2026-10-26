import 'reflect-metadata';
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { OperationsService } from './operations.service';
import { CommunityService } from './community.service';
import { notifyWaitlist } from './notifications';
const database = process.env.DATABASE_URL ? describe : describe.skip;
database('Operational boundaries for mixed-professional appointments', () => {
  let db: PrismaService,
    businessId: string,
    locationId: string,
    staffA: string,
    staffB: string,
    serviceId: string,
    bookingId: string,
    customerId: string;
  const token = randomUUID(),
    savedBusinessId = process.env.BUSINESS_ID;
  const start = new Date(Date.now() + 5 * 86400000),
    second = new Date(start.getTime() + 30 * 60000),
    secondEnd = new Date(start.getTime() + 60 * 60000),
    end = new Date(start.getTime() + 90 * 60000);
  beforeAll(async () => {
    db = new PrismaService();
    businessId = (
      await db.business.create({
        data: {
          name: 'Cadena test',
          slug: `mixed-ops-${randomUUID()}`,
          featureFlags: { multiStaffBookings: true, privateInternalFlag: 'not-public' },
        },
      })
    ).id;
    process.env.BUSINESS_ID = businessId;
    locationId = (
      await db.location.create({ data: { businessId, name: 'Sede test', address: 'Test' } })
    ).id;
    staffA = (
      await db.staff.create({ data: { businessId, locationId, name: 'Primera profesional' } })
    ).id;
    staffB = (
      await db.staff.create({
        data: {
          businessId,
          locationId,
          name: 'Segunda profesional',
          calendarTokenHash: createHash('sha256').update(token).digest('hex'),
        },
      })
    ).id;
    serviceId = (
      await db.service.create({
        data: { businessId, name: 'Servicio test', durationMinutes: 30, price: 30 },
      })
    ).id;
    customerId = (
      await db.customer.create({
        data: {
          businessId,
          name: 'Cliente test',
          email: 'mixed-ops@example.test',
          phone: '+59170123456',
        },
      })
    ).id;
    bookingId = (
      await db.booking.create({
        data: {
          businessId,
          locationId,
          staffId: staffA,
          customerId,
          code: randomUUID().replaceAll('-', '').slice(0, 8),
          startAt: start,
          endAt: end,
          status: 'CONFIRMED',
          totalAmount: 90,
        },
      })
    ).id;
    await db.bookingItem.createMany({
      data: [
        {
          businessId,
          bookingId,
          serviceId,
          staffId: staffA,
          serviceName: 'Etapa primaria',
          durationMinutes: 30,
          price: 30,
          startAt: start,
          endAt: second,
          position: 0,
        },
        {
          businessId,
          bookingId,
          serviceId,
          staffId: staffB,
          serviceName: 'Etapa secundaria',
          durationMinutes: 30,
          price: 30,
          startAt: second,
          endAt: secondEnd,
          position: 1,
        },
        {
          businessId,
          bookingId,
          serviceId,
          staffId: staffB,
          serviceName: 'Otra etapa secundaria',
          durationMinutes: 30,
          price: 30,
          startAt: secondEnd,
          endAt: end,
          position: 2,
        },
      ],
    });
  });
  afterAll(async () => {
    if (savedBusinessId === undefined) delete process.env.BUSINESS_ID;
    else process.env.BUSINESS_ID = savedBusinessId;
    if (businessId) {
      await db.notification.deleteMany({ where: { businessId } });
      await db.waitlistEntry.deleteMany({ where: { businessId } });
      await db.hold.deleteMany({ where: { businessId } });
      await db.booking.deleteMany({ where: { businessId } });
      await db.service.deleteMany({ where: { businessId } });
      await db.staff.deleteMany({ where: { businessId } });
      await db.customer.deleteMany({ where: { businessId } });
      await db.location.deleteMany({ where: { businessId } });
      await db.business.delete({ where: { id: businessId } });
    }
    if (db) await db.$disconnect();
  });
  it('exposes only the public mixed-staff flag from business feature configuration', async () => {
    const catalog = await new OperationsService(db).catalog();
    expect(catalog.business.featureFlags).toEqual({ multiStaffBookings: true });
  });
  it('feeds each professional only their assigned segment in iCal', async () => {
    const feed = await new CommunityService(db).calendar(staffB, { token });
    expect(feed).toContain('SUMMARY:Etapa secundaria');
    expect(feed).not.toContain('Etapa primaria');
    expect(feed).toContain(
      `DTSTART:${second
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')}`,
    );
  });
  it('prevents a holiday block over a secondary resource hold', async () => {
    const holdStart = new Date(end.getTime() + 3600000),
      holdEnd = new Date(holdStart.getTime() + 30 * 60000);
    const hold = await db.hold.create({
      data: {
        businessId,
        locationId,
        staffId: staffA,
        serviceId,
        startAt: holdStart,
        endAt: holdEnd,
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    await db.holdItem.create({
      data: {
        businessId,
        holdId: hold.id,
        staffId: staffB,
        serviceId,
        startAt: holdStart,
        endAt: holdEnd,
        position: 0,
      },
    });
    await expect(
      new OperationsService(db).create(
        'time-off',
        {
          locationId,
          staffId: staffB,
          startAt: holdStart.toISOString(),
          endAt: holdEnd.toISOString(),
          reason: 'Bloqueo de prueba',
        },
        { id: randomUUID(), businessId, role: 'ADMIN' },
        {},
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(await db.timeOff.count({ where: { businessId } })).toBe(0);
  });
  it('counts one distinct appointment per participating professional in reports', async () => {
    const reports = await new OperationsService(db).reports(
      {
        from: new Date(start.getTime() - 60000).toISOString(),
        to: new Date(end.getTime() + 60000).toISOString(),
      },
      { id: randomUUID(), businessId, role: 'ADMIN' },
    );
    const primary = reports.byStaff.find((row) => row.staffId === staffA),
      secondary = reports.byStaff.find((row) => row.staffId === staffB);
    expect(primary?.bookings).toBe(1);
    expect(secondary?.bookings).toBe(1);
    expect(primary?.occupiedMinutes).toBe(30);
    expect(secondary?.occupiedMinutes).toBe(60);
  });
  it('notifies waitlists matching a freed secondary segment', async () => {
    const entry = await db.waitlistEntry.create({
      data: {
        businessId,
        customerId,
        serviceId,
        staffId: staffB,
        locationId,
        from: second,
        to: end,
      },
    });
    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
      await notifyWaitlist(tx, bookingId);
    });
    expect((await db.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } })).status).toBe(
      'NOTIFIED',
    );
    expect(
      await db.notification.count({ where: { businessId, event: 'WAITLIST_AVAILABLE' } }),
    ).toBe(1);
  });
});
