import 'reflect-metadata';
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/common/prisma.service';
import { CommonModule } from '../src/common/common.module';
import { BookingsModule } from '../src/bookings/bookings.module';
import { AvailabilityModule } from '../src/availability/availability.module';
import { AntiAbuseService } from '../src/anti-abuse/anti-abuse.service';

const enabled = process.env.RUN_INTEGRATION === '1';
const businessId = randomUUID();
const locationId = randomUUID();
const staffId = randomUUID();
const secondStaffId = randomUUID();
const thirdStaffId = randomUUID();
const mixedServiceId = randomUUID();
const serviceId = randomUUID();
const classId = randomUUID();
const extraId = randomUUID();
const start = new Date();
start.setUTCDate(start.getUTCDate() + 4);
start.setUTCHours(14, 0, 0, 0);
const at = (days: number, minutes = 0) =>
  new Date(start.getTime() + days * 86_400_000 + minutes * 60_000).toISOString();
let db: PrismaService;
let app: INestApplication;
let aliceToken: string;
let bobToken: string;
let staffToken: string;
let secondStaffToken: string;
let thirdStaffToken: string;
let aliceId: string;
let bobId: string;
const customer = (label: string) => ({
  name: `Prueba ${label}`,
  email: `${label}-${businessId}@example.test`,
  phone: '+59171234567',
});
const input = (day: number, label: string, overrides = {}) => ({
  locationId,
  serviceIds: [serviceId],
  staffId,
  startAt: at(day),
  customer: customer(label),
  source: 'WEB',
  ...overrides,
});
const create = (body: object, key = randomUUID()) =>
  request(app.getHttpServer()).post('/api/v1/bookings').set('Idempotency-Key', key).send(body);

describe.skipIf(!enabled)('booking API with real MySQL transactions', () => {
  beforeAll(async () => {
    process.env.BUSINESS_ID = businessId;
    process.env.JWT_SECRET ||= randomBytes(48).toString('hex');
    const module = await Test.createTestingModule({
      imports: [CommonModule, AvailabilityModule, BookingsModule],
    })
      .overrideProvider(AntiAbuseService)
      .useValue({ assertGuest: async () => undefined })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    db = module.get(PrismaService);
    await db.business.create({
      data: {
        id: businessId,
        slug: `integration-${businessId}`,
        name: 'Integration isolated',
        minimumNoticeMinutes: 0,
        maximumAdvanceDays: 90,
        maxPendingBookings: 20,
        featureFlags: { multiStaffBookings: true },
      },
    });
    await db.location.create({
      data: {
        id: locationId,
        businessId,
        name: 'Test La Paz',
        address: 'Datos sintéticos',
        timezone: 'America/La_Paz',
      },
    });
    await db.staff.createMany({
      data: [staffId, secondStaffId, thirdStaffId].map((id, sortOrder) => ({
        id,
        businessId,
        locationId,
        name: `Test ${sortOrder}`,
        sortOrder,
      })),
    });
    await db.service.createMany({
      data: [
        {
          id: serviceId,
          businessId,
          name: 'Individual',
          durationMinutes: 30,
          price: 50,
          capacity: 1,
        },
        { id: classId, businessId, name: 'Clase', durationMinutes: 60, price: 25, capacity: 2 },
        {
          id: extraId,
          businessId,
          name: 'Complemento',
          durationMinutes: 15,
          price: 20,
          capacity: 1,
          bufferBeforeMinutes: 10,
          bufferAfterMinutes: 5,
        },
      ],
    });
    await db.service.create({
      data: {
        id: mixedServiceId,
        businessId,
        name: 'Especialidad',
        durationMinutes: 30,
        price: 80,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 5,
      },
    });
    for (const sid of [staffId, secondStaffId, thirdStaffId]) {
      await db.staffService.createMany({
        data: [serviceId, classId, extraId, mixedServiceId].map((service) => ({
          businessId,
          staffId: sid,
          serviceId: service,
        })),
      });
      await db.workingHours.createMany({
        data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          businessId,
          locationId,
          staffId: sid,
          dayOfWeek,
          startMinute: 8 * 60,
          endMinute: 18 * 60,
        })),
      });
    }
    await db.staffService.update({
      where: {
        businessId_staffId_serviceId: {
          businessId,
          staffId: secondStaffId,
          serviceId: mixedServiceId,
        },
      },
      data: { durationMinutes: 45, price: 90 },
    });
    async function actor(label: string, role: 'CLIENT' | 'STAFF', targetStaffId = staffId) {
      const contact = customer(label);
      const user = await db.user.create({
        data: {
          businessId,
          ...contact,
          passwordHash: 'synthetic-test-unusable',
          role,
          emailVerifiedAt: new Date(),
        },
      });
      if (role === 'CLIENT')
        await db.customer.create({ data: { businessId, userId: user.id, ...contact } });
      else await db.staff.update({ where: { id: targetStaffId }, data: { userId: user.id } });
      const session = await db.refreshSession.create({
        data: {
          businessId,
          userId: user.id,
          tokenHash: randomBytes(32).toString('hex'),
          familyId: randomUUID(),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      const token = await module.get(JwtService).signAsync(
        { sub: user.id, sid: session.id, businessId },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: '15m',
          algorithm: 'HS256',
          issuer: 'reservas-api',
          audience: 'reservas-clients',
        },
      );
      return { id: user.id, token };
    }
    const alice = await actor('alice', 'CLIENT');
    aliceToken = alice.token;
    aliceId = alice.id;
    const bob = await actor('bob', 'CLIENT');
    bobToken = bob.token;
    bobId = bob.id;
    staffToken = (await actor('staff', 'STAFF')).token;
    secondStaffToken = (await actor('second-staff', 'STAFF', secondStaffId)).token;
    thirdStaffToken = (await actor('third-staff', 'STAFF', thirdStaffId)).token;
  }, 30_000);

  afterAll(async () => {
    if (db) {
      // Isolated test tenant only; leave the user's seeded and real data untouched.
      await db.slotClaim.deleteMany({ where: { businessId } });
      await db.reminder.deleteMany({ where: { businessId } });
      await db.notification.deleteMany({ where: { businessId } });
      await db.auditLog.deleteMany({ where: { businessId } });
      await db.idempotencyRecord.deleteMany({ where: { businessId } });
      await db.hold.deleteMany({ where: { businessId } });
      await db.bookingItem.deleteMany({ where: { businessId } });
      await db.booking.deleteMany({ where: { businessId } });
      await db.customer.deleteMany({ where: { businessId } });
      await db.staffService.deleteMany({ where: { businessId } });
      await db.workingHours.deleteMany({ where: { businessId } });
      await db.staff.deleteMany({ where: { businessId } });
      await db.refreshSession.deleteMany({ where: { businessId } });
      await db.user.deleteMany({ where: { businessId } });
      await db.service.deleteMany({ where: { businessId } });
      await db.location.deleteMany({ where: { businessId } });
      await db.business.delete({ where: { id: businessId } });
    }
    await app?.close();
  }, 30_000);

  it('allows exactly one of twelve concurrent requests for a single seat', async () => {
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, index) => create(input(0, `race${index}`))),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, ...Array(11).fill(409)]);
    expect(await db.booking.count({ where: { businessId, startAt: new Date(at(0)) } })).toBe(1);
    expect(
      await db.slotClaim.count({ where: { businessId, staffId, minute: new Date(at(0)) } }),
    ).toBe(1);
  }, 30_000);

  it('replays simultaneous identical keys and refuses mismatched payloads', async () => {
    const body = input(1, 'same-key');
    const key = randomUUID();
    const responses = await Promise.all(Array.from({ length: 6 }, () => create(body, key)));
    expect(responses.map((response) => response.status)).toEqual(Array(6).fill(201));
    expect(new Set(responses.map((response) => response.body.id)).size).toBe(1);
    expect(new Set(responses.map((response) => response.body.manageToken)).size).toBe(1);
    expect((await create({ ...body, notes: 'different' }, key)).status).toBe(409);
    expect(await db.booking.count({ where: { businessId, startAt: new Date(at(1)) } })).toBe(1);
  }, 30_000);

  it('requires idempotency and blocks a forged administrative source', async () => {
    expect(
      (await request(app.getHttpServer()).post('/api/v1/bookings').send(input(2, 'no-key'))).status,
    ).toBe(400);
    expect((await create(input(2, 'forged', { source: 'ADMIN' }))).status).toBe(403);
  });

  it('holds a slot, refuses unrelated claims and consumes the bearer token once', async () => {
    const body = input(2, 'held');
    const query = { serviceId, staffId, locationId, from: at(2), to: at(2, 60) };
    const before = await request(app.getHttpServer()).get('/api/v1/availability').query(query);
    expect(before.body.data.some((slot: { startAt: string }) => slot.startAt === at(2))).toBe(true);
    const held = await request(app.getHttpServer())
      .post('/api/v1/bookings/holds')
      .send({ serviceIds: body.serviceIds, locationId, staffId, startAt: body.startAt });
    expect(held.status).toBe(201);
    const after = await request(app.getHttpServer()).get('/api/v1/availability').query(query);
    expect(after.body.data.some((slot: { startAt: string }) => slot.startAt === at(2))).toBe(false);
    expect((await create(body)).status).toBe(409);
    const reserved = await create({ ...body, holdToken: held.body.holdToken });
    expect(reserved.status).toBe(201);
    expect((await db.hold.findUnique({ where: { id: held.body.id } }))?.consumedAt).toBeTruthy();
    expect(
      (await create({ ...body, customer: customer('hold-reuse'), holdToken: held.body.holdToken }))
        .status,
    ).toBe(409);
  });

  it('allows two seats of the exact same class and blocks incompatible overlaps', async () => {
    const responses = await Promise.all(
      [0, 1, 2].map((index) => create(input(3, `class${index}`, { serviceIds: [classId] }))),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 201, 409]);
    expect((await create(input(3, 'different-service'))).status).toBe(409);
    expect(
      (await create(input(3, 'shifted-class', { serviceIds: [classId], startAt: at(3, 15) })))
        .status,
    ).toBe(409);
  });

  it('chains multiple services and snapshots durations, buffers and prices', async () => {
    const created = await create(input(4, 'bundle', { serviceIds: [serviceId, extraId] }));
    expect(created.status).toBe(201);
    expect(created.body.items.map((item: { serviceName: string }) => item.serviceName)).toEqual([
      'Individual',
      'Complemento',
    ]);
    expect(created.body.items[1].startAt).toBe(at(4, 40));
    expect(created.body.endAt).toBe(at(4, 55));
    expect(Number(created.body.totalAmount)).toBe(70);
    await db.service.update({ where: { id: extraId }, data: { price: 999 } });
    expect(
      Number(
        (
          await db.bookingItem.findFirst({
            where: { bookingId: created.body.id, serviceId: extraId },
          })
        )?.price,
      ),
    ).toBe(20);
    const moved = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/manage/${created.body.manageToken}`)
      .set('If-Match', '1')
      .send({ startAt: at(4, 120) });
    expect(moved.status).toBe(200);
    expect(Number(moved.body.totalAmount)).toBe(70);
    expect(Number(moved.body.items[1].price)).toBe(20);
    await db.service.update({ where: { id: extraId }, data: { durationMinutes: 90 } });
    const changed = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/manage/${created.body.manageToken}`)
      .set('If-Match', '2')
      .send({ startAt: at(4, 180) });
    expect(changed.status).toBe(409);
    expect(await db.slotClaim.count({ where: { bookingId: created.body.id } })).toBe(60);
  });

  it('supports secure guest management, optimistic versions and calendar exports', async () => {
    const created = await create(input(5, 'guest'));
    expect(created.status).toBe(201);
    const url = `/api/v1/bookings/manage/${created.body.manageToken}`;
    const view = await request(app.getHttpServer()).get(url);
    expect(view.status).toBe(200);
    expect(view.body.manageTokenHash).toBeUndefined();
    expect(view.body.customer).toBeUndefined();
    expect(
      (
        await request(app.getHttpServer()).get(
          `/api/v1/bookings/manage/${created.body.id}.${'a'.repeat(43)}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(app.getHttpServer()).patch(url).send({ status: 'CANCELLED' })).status,
    ).toBe(428);
    const rescheduled = await request(app.getHttpServer())
      .patch(url)
      .set('If-Match', '1')
      .send({ startAt: at(5, 60) });
    expect(rescheduled.status).toBe(200);
    expect(rescheduled.body.version).toBe(2);
    expect(
      (
        await request(app.getHttpServer())
          .patch(url)
          .set('If-Match', '1')
          .send({ status: 'CANCELLED' })
      ).status,
    ).toBe(412);
    const calendar = await request(app.getHttpServer()).get(`${url}/calendar.ics`);
    expect(calendar.text).toContain('BEGIN:VEVENT');
    expect(calendar.text).toContain(created.body.id);
    expect(
      (
        await request(app.getHttpServer())
          .patch(url)
          .set('If-Match', '2')
          .send({ status: 'CANCELLED' })
      ).status,
    ).toBe(200);
    expect(await db.slotClaim.count({ where: { bookingId: created.body.id } })).toBe(0);
  });

  it('prevents client and staff IDOR in detail, lists and mutations', async () => {
    const alice = await create(input(6, 'alice')).set('Authorization', `Bearer ${aliceToken}`);
    const bob = await create(input(6, 'bob', { staffId: secondStaffId })).set(
      'Authorization',
      `Bearer ${bobToken}`,
    );
    expect(alice.status).toBe(201);
    expect(bob.status).toBe(201);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/bookings/${alice.body.id}`)
          .set('Authorization', `Bearer ${bobToken}`)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/bookings/${alice.body.id}`)
          .set('Authorization', `Bearer ${bobToken}`)
          .set('If-Match', '1')
          .send({ status: 'CANCELLED' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/bookings/${bob.body.id}`)
          .set('Authorization', `Bearer ${staffToken}`)
      ).status,
    ).toBe(404);
    const list = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((value: { id: string }) => value.id)).toEqual([alice.body.id]);
    expect(aliceId).not.toEqual(bobId);
  });
  it('enforces the twelve-hour cancellation cutoff at the server, including the exact boundary', async () => {
    const first = await create(input(7, 'cutoff-exact'));
    const second = await create(input(7, 'cutoff-late', { staffId: secondStaffId }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(Date.parse(at(7)) - 12 * 3_600_000));
      const exact = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/manage/${first.body.manageToken}`)
        .set('If-Match', '1')
        .send({ status: 'CANCELLED' });
      expect(exact.status).toBe(200);
      vi.setSystemTime(new Date(Date.parse(at(7)) - 12 * 3_600_000 + 1));
      const late = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/manage/${second.body.manageToken}`)
        .set('If-Match', '1')
        .send({ status: 'CANCELLED' });
      expect(late.status).toBe(403);
      expect((await db.booking.findUnique({ where: { id: second.body.id } }))?.status).toBe(
        'CONFIRMED',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the location timezone when serving availability from the API', async () => {
    await db.location.update({ where: { id: locationId }, data: { timezone: 'Europe/Madrid' } });
    try {
      const from = new Date(at(8));
      from.setUTCHours(0, 0, 0, 0);
      const to = new Date(from.getTime() + 86_400_000);
      const available = await request(app.getHttpServer())
        .get('/api/v1/availability')
        .query({ serviceId, staffId, locationId, from: from.toISOString(), to: to.toISOString() });
      expect(available.status).toBe(200);
      expect(available.body.timezone).toBe('Europe/Madrid');
      expect(available.body.data.length).toBeGreaterThan(0);
      const localHour = new Intl.DateTimeFormat('es-BO', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(available.body.data[0].startAt));
      expect(localHour).toBe('08');
    } finally {
      await db.location.update({ where: { id: locationId }, data: { timezone: 'America/La_Paz' } });
    }
  });

  it('reclaims expired pending slot claims inside the resource lock before accepting another booking', async () => {
    const old = await create(input(9, 'expiring'));
    expect(old.status).toBe(201);
    await db.booking.update({
      where: { id: old.body.id },
      data: { status: 'PENDING', expiresAt: new Date(Date.now() - 1) },
    });
    const rivals = await Promise.all([0, 1, 2].map((i) => create(input(9, `after-expiry-${i}`))));
    expect(rivals.map((response) => response.status).sort()).toEqual([201, 409, 409]);
    expect(await db.slotClaim.count({ where: { bookingId: old.body.id } })).toBe(0);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/bookings/manage/${old.body.manageToken}`)
          .set('If-Match', '1')
          .send({ startAt: at(9, 60) })
      ).status,
    ).toBe(409);
  });

  it('cannot consume the same class hold twice through concurrent requests', async () => {
    const body = { locationId, serviceIds: [classId], staffId, startAt: at(10) };
    const held = await request(app.getHttpServer()).post('/api/v1/bookings/holds').send(body);
    expect(held.status).toBe(201);
    const results = await Promise.all(
      [0, 1].map((i) =>
        create({ ...body, customer: customer(`class-hold-${i}`), holdToken: held.body.holdToken }),
      ),
    );
    expect(results.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await db.booking.count({ where: { businessId, startAt: new Date(at(10)) } })).toBe(1);
  });

  it('allows only one concurrent edit for a given version and releases the previous interval', async () => {
    const created = await create(input(11, 'edit-race'));
    expect(created.status).toBe(201);
    const attempts = await Promise.all(
      [60, 120].map((offset) =>
        request(app.getHttpServer())
          .patch(`/api/v1/bookings/manage/${created.body.manageToken}`)
          .set('If-Match', '1')
          .send({ startAt: at(11, offset) }),
      ),
    );
    expect(attempts.map((response) => response.status).sort()).toEqual([200, 412]);
    expect(
      await db.slotClaim.count({ where: { businessId, staffId, minute: new Date(at(11)) } }),
    ).toBe(0);
  });
  it('calculates a multi-professional itinerary with each override, buffer, price and timezone', async () => {
    const available = await request(app.getHttpServer())
      .get('/api/v1/availability')
      .query({
        serviceIds: `${serviceId},${mixedServiceId}`,
        staffIds: `${staffId},${secondStaffId}`,
        locationId,
        from: at(12),
        to: at(12, 15),
      });
    expect(available.status).toBe(200);
    const slot = available.body.data[0];
    expect(slot.staffIds).toEqual([staffId, secondStaffId]);
    expect(
      slot.segments.map((segment: { startAt: string; endAt: string }) => [
        segment.startAt,
        segment.endAt,
      ]),
    ).toEqual([
      [at(12), at(12, 30)],
      [at(12, 40), at(12, 85)],
    ]);
    expect(slot.totalAmount).toBe(140);
    expect(slot.endAt).toBe(at(12, 85));
    expect(available.body.timezone).toBe('America/La_Paz');
    const automatic = await request(app.getHttpServer())
      .get('/api/v1/availability')
      .query({
        serviceIds: `${serviceId},${mixedServiceId}`,
        staffIds: 'any,any',
        locationId,
        from: at(12),
        to: at(12, 15),
      });
    expect(automatic.status).toBe(200);
    expect(automatic.body.data[0].staffIds).toHaveLength(2);
  });

  it('atomically holds all professionals, enforces the token assignments, and consumes the group once', async () => {
    const body = {
      locationId,
      serviceIds: [serviceId, mixedServiceId],
      staffIds: [staffId, secondStaffId],
      startAt: at(13),
    };
    const held = await request(app.getHttpServer()).post('/api/v1/bookings/holds').send(body);
    expect(held.status).toBe(201);
    expect(held.body.staffIds).toEqual([staffId, secondStaffId]);
    expect(await db.holdItem.count({ where: { holdId: held.body.id } })).toBe(2);
    expect((await create(input(13, 'first-held'))).status).toBe(409);
    expect(
      (await create(input(13, 'second-held', { staffId: secondStaffId, startAt: at(13, 45) })))
        .status,
    ).toBe(409);
    expect(
      (
        await create({
          ...body,
          staffIds: [staffId, thirdStaffId],
          customer: customer('wrong-hold'),
          holdToken: held.body.holdToken,
        })
      ).status,
    ).toBe(409);
    const booked = await create({
      ...body,
      customer: customer('mixed-held'),
      holdToken: held.body.holdToken,
    });
    expect(booked.status).toBe(201);
    expect(booked.body.items.map((item: { staffId: string }) => item.staffId)).toEqual([
      staffId,
      secondStaffId,
    ]);
    expect(await db.slotClaim.count({ where: { bookingId: booked.body.id, staffId } })).toBe(30);
    expect(
      await db.slotClaim.count({ where: { bookingId: booked.body.id, staffId: secondStaffId } }),
    ).toBe(60);
    expect(
      (await create({ ...body, customer: customer('mixed-reuse'), holdToken: held.body.holdToken }))
        .status,
    ).toBe(409);
  });

  it('serializes competing reversed resource orders without deadlocks or partial reservations', async () => {
    const responses = await Promise.all([
      create({
        locationId,
        serviceIds: [serviceId, mixedServiceId],
        staffIds: [staffId, secondStaffId],
        startAt: at(14),
        customer: customer('cross-ab'),
      }),
      create({
        locationId,
        serviceIds: [serviceId, mixedServiceId],
        staffIds: [secondStaffId, staffId],
        startAt: at(14, 15),
        customer: customer('cross-ba'),
      }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const winner = responses.find((response) => response.status === 201)!;
    expect(
      await db.booking.count({
        where: { businessId, startAt: { gte: new Date(at(14)), lt: new Date(at(14, 30)) } },
      }),
    ).toBe(1);
    expect(await db.bookingItem.count({ where: { bookingId: winner.body.id } })).toBe(2);
    expect(
      await db.slotClaim.groupBy({ by: ['staffId'], where: { bookingId: winner.body.id } }),
    ).toHaveLength(2);
  });

  it('keeps mixed bookings atomic on reprogramming and cancellation while preserving price snapshots', async () => {
    const created = await create({
      locationId,
      serviceIds: [serviceId, mixedServiceId],
      staffIds: [staffId, secondStaffId],
      startAt: at(15),
      customer: customer('mixed-moving'),
    });
    expect(created.status).toBe(201);
    const url = `/api/v1/bookings/manage/${created.body.manageToken}`;
    const moved = await request(app.getHttpServer())
      .patch(url)
      .set('If-Match', '1')
      .send({ startAt: at(15, 120) });
    expect(moved.status).toBe(200);
    expect(moved.body.items.map((item: { staffId: string }) => item.staffId)).toEqual([
      staffId,
      secondStaffId,
    ]);
    expect(Number(moved.body.totalAmount)).toBe(140);
    await db.staffService.update({
      where: {
        businessId_staffId_serviceId: {
          businessId,
          staffId: thirdStaffId,
          serviceId: mixedServiceId,
        },
      },
      data: { durationMinutes: 45, price: 200 },
    });
    const reassigned = await request(app.getHttpServer())
      .patch(url)
      .set('If-Match', '2')
      .send({ startAt: at(15, 180), staffIds: [staffId, thirdStaffId] });
    expect(reassigned.status).toBe(200);
    expect(Number(reassigned.body.totalAmount)).toBe(140);
    expect(Number(reassigned.body.items[1].price)).toBe(90);
    expect(
      await db.slotClaim.count({ where: { bookingId: created.body.id, staffId: secondStaffId } }),
    ).toBe(0);
    expect(
      await db.slotClaim.count({ where: { bookingId: created.body.id, staffId: thirdStaffId } }),
    ).toBe(60);
    expect(
      await db.slotClaim.count({
        where: { bookingId: created.body.id, minute: { lt: new Date(at(15, 120)) } },
      }),
    ).toBe(0);
    const cancelled = await request(app.getHttpServer())
      .patch(url)
      .set('If-Match', '3')
      .send({ status: 'CANCELLED' });
    expect(cancelled.status).toBe(200);
    expect(await db.slotClaim.count({ where: { bookingId: created.body.id } })).toBe(0);
  });

  it('restricts staff lists, details, calendars and edits to their own mixed-booking segment', async () => {
    const created = await create({
      locationId,
      serviceIds: [serviceId, mixedServiceId],
      staffIds: [staffId, secondStaffId],
      startAt: at(16),
      customer: customer('mixed-idor'),
    });
    expect(created.status).toBe(201);
    const own = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${created.body.id}`)
      .set('Authorization', `Bearer ${secondStaffToken}`);
    expect(own.status).toBe(200);
    expect(own.body.items).toHaveLength(1);
    expect(own.body.canManage).toBe(false);
    expect(own.body.mixedStaff).toBe(true);
    expect(own.body.items[0].staffId).toBe(secondStaffId);
    expect(own.body.startAt).toBe(at(16, 40));
    expect(Number(own.body.totalAmount)).toBe(90);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/bookings/${created.body.id}`)
          .set('Authorization', `Bearer ${thirdStaffToken}`)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/bookings/${created.body.id}`)
          .set('Authorization', `Bearer ${secondStaffToken}`)
          .set('If-Match', '1')
          .send({ status: 'CANCELLED' })
      ).status,
    ).toBe(403);
    const list = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .query({ from: at(16, 30), to: at(16, 90), locationId })
      .set('Authorization', `Bearer ${secondStaffToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((booking: { id: string }) => booking.id)).toContain(created.body.id);
    const ownCalendar = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${created.body.id}/calendar.ics`)
      .set('Authorization', `Bearer ${secondStaffToken}`);
    expect(ownCalendar.text.match(/BEGIN:VEVENT/g) ?? []).toHaveLength(1);
    expect(ownCalendar.text).toContain('Especialidad');
    expect(ownCalendar.text).not.toContain('SUMMARY:Individual');
    const guestCalendar = await request(app.getHttpServer()).get(
      `/api/v1/bookings/manage/${created.body.manageToken}/calendar.ics`,
    );
    expect(guestCalendar.text.match(/BEGIN:VEVENT/g) ?? []).toHaveLength(2);
  });

  it('rejects malformed, cross-resource and disabled multi-staff assignments', async () => {
    const body = {
      locationId,
      serviceIds: [serviceId, mixedServiceId],
      staffIds: [staffId, secondStaffId],
      startAt: at(17),
      customer: customer('invalid-mixed'),
    };
    expect((await create({ ...body, staffIds: [staffId] })).status).toBe(400);
    expect((await create({ ...body, staffId })).status).toBe(400);
    expect((await create({ ...body, staffIds: [staffId, randomUUID()] })).status).toBe(404);
    await db.business.update({
      where: { id: businessId },
      data: { featureFlags: { multiStaffBookings: false } },
    });
    try {
      expect((await create(body)).status).toBe(400);
    } finally {
      await db.business.update({
        where: { id: businessId },
        data: { featureFlags: { multiStaffBookings: true } },
      });
    }
  });
  it('chains professionals across midnight in the branch timezone and rejects a blocked second segment', async () => {
    await db.workingHours.updateMany({
      where: { businessId, staffId: { in: [staffId, secondStaffId] } },
      data: { startMinute: 22 * 60, endMinute: 26 * 60 },
    });
    const beginning = new Date(at(18));
    beginning.setUTCHours(3, 30, 0, 0);
    const body = {
      locationId,
      serviceIds: [serviceId, mixedServiceId],
      staffIds: [staffId, secondStaffId],
      startAt: beginning.toISOString(),
      customer: customer('overnight-chain'),
    };
    try {
      const created = await create(body);
      expect(created.status).toBe(201);
      expect(created.body.items[1].startAt).toBe(
        new Date(beginning.getTime() + 40 * 60_000).toISOString(),
      );
      const localStart = new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(created.body.items[1].startAt));
      expect(localStart).toBe('00:10');
      const nextStart = new Date(beginning.getTime() + 86_400_000);
      const off = await db.timeOff.create({
        data: {
          businessId,
          locationId,
          staffId: secondStaffId,
          startAt: new Date(nextStart.getTime() + 30 * 60_000),
          endAt: new Date(nextStart.getTime() + 120 * 60_000),
          reason: 'Feriado de prueba',
        },
      });
      try {
        const blocked = await create({
          ...body,
          startAt: nextStart.toISOString(),
          customer: customer('overnight-blocked'),
        });
        expect(blocked.status).toBe(409);
        expect(await db.booking.count({ where: { businessId, startAt: nextStart } })).toBe(0);
      } finally {
        await db.timeOff.delete({ where: { id: off.id } });
      }
    } finally {
      await db.workingHours.updateMany({
        where: { businessId, staffId: { in: [staffId, secondStaffId] } },
        data: { startMinute: 8 * 60, endMinute: 18 * 60 },
      });
    }
  });
});
