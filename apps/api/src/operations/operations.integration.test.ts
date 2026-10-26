import 'reflect-metadata';
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../common/prisma.service';
import { ProblemFilter } from '../common/problem.filter';
import { OperationsModule } from './operations.module';
import { renderTemplate } from './notifications';
import { validateWebSubscription } from './delivery';

const dbDescribe = process.env.DATABASE_URL ? describe : describe.skip;
dbDescribe('Operations: tenant isolation, manual payments and private receipts', () => {
  let app: INestApplication, db: PrismaService;
  const suffix = randomUUID(),
    guestToken = randomUUID(),
    key = randomUUID();
  let adminToken: string,
    clientToken: string,
    adminId: string,
    clientId: string,
    customerId: string;
  let locationId: string, staffId: string, serviceId: string, bookingId: string, paymentId: string;
  let otherBusinessId: string,
    otherLocationId: string,
    ownSettingId: string,
    otherSettingId: string;
  const previousNamespace = process.env.RATE_LIMIT_NAMESPACE;
  beforeAll(async () => {
    process.env.RATE_LIMIT_NAMESPACE = `reservas:rate:ops-test:${suffix}`;
    const module = await Test.createTestingModule({
      imports: [CommonModule, AuthModule, OperationsModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ProblemFilter());
    await app.init();
    db = app.get(PrismaService);
    const register = async (label: string) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `${label}-${suffix}@example.test`,
          password: 'OperationsTestPassword25!',
          name: `Prueba ${label}`,
          phone: '+59170123456',
          platform: 'mobile',
        });
    const admin = await register('admin'),
      client = await register('client');
    expect(admin.status).toBe(201);
    expect(client.status).toBe(201);
    adminToken = admin.body.accessToken;
    adminId = admin.body.user.id;
    clientToken = client.body.accessToken;
    clientId = client.body.user.id;
    await db.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
    customerId = (await db.customer.findFirstOrThrow({ where: { userId: clientId } })).id;
    const businessId = process.env.BUSINESS_ID!;
    locationId = (
      await db.location.create({
        data: { businessId, name: 'Operaciones test', address: 'Prueba local' },
      })
    ).id;
    staffId = (
      await db.staff.create({
        data: {
          businessId,
          locationId,
          name: 'Profesional test',
          calendarTokenHash: createHash('sha256').update('hidden').digest('hex'),
        },
      })
    ).id;
    serviceId = (
      await db.service.create({
        data: {
          businessId,
          name: `Servicio ${suffix}`,
          durationMinutes: 30,
          price: 100,
          depositAmount: 30,
        },
      })
    ).id;
    await db.staffService.create({ data: { businessId, staffId, serviceId } });
    bookingId = (
      await db.booking.create({
        data: {
          businessId,
          locationId,
          staffId,
          customerId,
          code: suffix.replaceAll('-', '').slice(0, 8).toUpperCase(),
          startAt: new Date(Date.now() + 48 * 3600000),
          endAt: new Date(Date.now() + 49 * 3600000),
          totalAmount: 100,
          depositAmount: 30,
          manageTokenHash: createHash('sha256').update(guestToken).digest('hex'),
          expiresAt: new Date(Date.now() + 24 * 3600000),
        },
      })
    ).id;
    await db.bookingItem.create({
      data: {
        businessId,
        bookingId,
        serviceId,
        staffId,
        serviceName: 'Servicio test',
        durationMinutes: 30,
        price: 100,
        depositAmount: 30,
        startAt: new Date(Date.now() + 48 * 3600000),
        endAt: new Date(Date.now() + 49 * 3600000),
      },
    });
    otherBusinessId = (
      await db.business.create({ data: { name: 'Otro negocio', slug: `other-${suffix}` } })
    ).id;
    otherLocationId = (
      await db.location.create({
        data: { businessId: otherBusinessId, name: 'Otra sede', address: 'Otra ubicación' },
      })
    ).id;
    const settingKey = `test.${suffix}`;
    ownSettingId = (
      await db.setting.create({ data: { businessId, key: settingKey, value: { label: 'own' } } })
    ).id;
    otherSettingId = (
      await db.setting.create({
        data: { businessId: otherBusinessId, key: settingKey, value: { label: 'other' } },
      })
    ).id;
  });
  afterAll(async () => {
    if (db) {
      await db.notification.deleteMany({
        where: { userId: { in: [adminId, clientId].filter(Boolean) } },
      });
      if (paymentId) {
        await db.paymentRefund.deleteMany({ where: { paymentId } });
        await db.idempotencyRecord.deleteMany({ where: { scope: `refund:${paymentId}` } });
      }
      if (bookingId) {
        await db.payment.deleteMany({ where: { bookingId } });
        await db.review.deleteMany({ where: { bookingId } });
        await db.booking.deleteMany({ where: { id: bookingId } });
        await db.idempotencyRecord.deleteMany({ where: { scope: `payment:${bookingId}` } });
      }
      if (serviceId) await db.service.deleteMany({ where: { id: serviceId } });
      if (staffId) await db.staff.deleteMany({ where: { id: staffId } });
      if (locationId) await db.location.deleteMany({ where: { id: locationId } });
      await db.setting.deleteMany({
        where: { id: { in: [ownSettingId, otherSettingId].filter(Boolean) } },
      });
      if (otherBusinessId) {
        await db.location.deleteMany({ where: { businessId: otherBusinessId } });
        await db.business.deleteMany({ where: { id: otherBusinessId } });
      }
      const ids = [adminId, clientId].filter(Boolean);
      await db.customer.deleteMany({ where: { userId: { in: ids } } });
      await db.auditLog.deleteMany({
        where: {
          OR: [
            { userId: { in: ids } },
            { entityId: { in: [serviceId, paymentId].filter(Boolean) } },
          ],
        },
      });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
    if (previousNamespace === undefined) delete process.env.RATE_LIMIT_NAMESPACE;
    else process.env.RATE_LIMIT_NAMESPACE = previousNamespace;
  });
  it('exposes only public staff fields in the catalog', async () => {
    const r = await request(app.getHttpServer()).get('/api/v1/catalog');
    expect(r.status).toBe(200);
    const staff = r.body.staff.find((s: { id: string }) => s.id === staffId);
    expect(staff).toBeTruthy();
    expect(staff.calendarTokenHash).toBeUndefined();
    expect(staff.userId).toBeUndefined();
  });
  it('protects administration and rejects foreign-tenant references', async () => {
    const denied = await request(app.getHttpServer())
      .get('/api/v1/admin/services')
      .auth(clientToken, { type: 'bearer' });
    expect(denied.status).toBe(403);
    const foreign = await request(app.getHttpServer())
      .patch(`/api/v1/admin/staff/${staffId}`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ locationId: otherLocationId });
    expect(foreign.status).toBe(400);
    expect((await db.staff.findUniqueOrThrow({ where: { id: staffId } })).locationId).toBe(
      locationId,
    );
  });
  it('isolates settings with the same key across tenants for reads and writes', async () => {
    const own = await request(app.getHttpServer())
      .get(`/api/v1/admin/settings/${ownSettingId}`)
      .auth(adminToken, { type: 'bearer' });
    expect(own.status).toBe(200);
    expect(own.body.value).toEqual({ label: 'own' });
    const foreignPath = `/api/v1/admin/settings/${otherSettingId}`;
    expect(
      (await request(app.getHttpServer()).get(foreignPath).auth(adminToken, { type: 'bearer' }))
        .status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .patch(foreignPath)
          .auth(adminToken, { type: 'bearer' })
          .set('If-Match', '1')
          .send({ value: { label: 'changed' } })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .delete(foreignPath)
          .auth(adminToken, { type: 'bearer' })
          .set('If-Match', '1')
      ).status,
    ).toBe(404);
    expect((await db.setting.findUniqueOrThrow({ where: { id: otherSettingId } })).value).toEqual({
      label: 'other',
    });
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/settings?limit=100')
      .auth(adminToken, { type: 'bearer' });
    expect(list.status).toBe(200);
    expect(
      list.body.items.every(
        (row: { businessId: string }) => row.businessId === process.env.BUSINESS_ID,
      ),
    ).toBe(true);
  });
  it('rejects mass assignment of tenant and private staff fields', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/admin/settings')
      .auth(adminToken, { type: 'bearer' })
      .send({ key: `injected.${suffix}`, value: 'ignored', businessId: otherBusinessId });
    expect(create.status).toBe(400);
    const patch = await request(app.getHttpServer())
      .patch(`/api/v1/admin/settings/${ownSettingId}`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ value: 'ignored', businessId: otherBusinessId, version: 99 });
    expect(patch.status).toBe(400);
    expect((await db.setting.findUniqueOrThrow({ where: { id: ownSettingId } })).value).toEqual({
      label: 'own',
    });
    const staffPatch = await request(app.getHttpServer())
      .patch(`/api/v1/admin/staff/${staffId}`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ calendarTokenHash: 'a'.repeat(64) });
    expect(staffPatch.status).toBe(400);
  });
  it('never returns calendar secret hashes when updating staff', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/admin/staff/${staffId}`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ bio: 'Biografía actualizada' });
    expect(response.status).toBe(200);
    expect(response.body.calendarTokenHash).toBeUndefined();
    expect((await db.staff.findUniqueOrThrow({ where: { id: staffId } })).calendarTokenHash).toBe(
      createHash('sha256').update('hidden').digest('hex'),
    );
  });
  it('rejects cross-tenant foreign keys at the database boundary', async () => {
    await expect(
      db.staff.create({
        data: {
          businessId: process.env.BUSINESS_ID!,
          locationId: otherLocationId,
          name: 'Invalid tenant link',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
  it('rejects fields that exceed database column lengths before writing', async () => {
    const address = await request(app.getHttpServer())
      .post('/api/v1/admin/locations')
      .auth(adminToken, { type: 'bearer' })
      .send({ name: 'Sede inválida', address: 'a'.repeat(301) });
    expect(address.status).toBe(400);
    const photo = await request(app.getHttpServer())
      .patch(`/api/v1/admin/staff/${staffId}`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '2')
      .send({ photoUrl: `https://example.test/${'a'.repeat(500)}` });
    expect(photo.status).toBe(400);
  });
  it('rejects executable URL schemes in every publicly rendered URL field', async () => {
    for (const malicious of [
      'javascript:alert(1)',
      'data:image/svg+xml,<svg onload=alert(1)>',
      'ftp://example.test/photo.png',
      'http://',
      'https://user:password@example.test/photo.png',
    ]) {
      for (const [endpoint, field] of [
        [`/admin/staff/${staffId}`, 'photoUrl'],
        [`/admin/locations/${locationId}`, 'mapUrl'],
        ['/admin/business', 'logoUrl'],
      ]) {
        const response = await request(app.getHttpServer())
          .patch(`/api/v1${endpoint}`)
          .auth(adminToken, { type: 'bearer' })
          .set('If-Match', '2')
          .send({ [field]: malicious });
        expect(response.status).toBe(400);
      }
      const qr = await request(app.getHttpServer())
        .post('/api/v1/admin/settings')
        .auth(adminToken, { type: 'bearer' })
        .send({ key: 'payment.instructions', value: { qrUrl: malicious } });
      expect(qr.status).toBe(400);
    }
    expect((await db.staff.findUniqueOrThrow({ where: { id: staffId } })).photoUrl).toBeNull();
    expect((await db.location.findUniqueOrThrow({ where: { id: locationId } })).mapUrl).toBeNull();
  });
  it('rejects a time-off block overlapping a live booking', async () => {
    const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/time-off')
      .auth(adminToken, { type: 'bearer' })
      .send({
        staffId,
        locationId,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        reason: 'Bloqueo prueba',
      });
    expect(response.status).toBe(409);
    expect(await db.timeOff.count({ where: { staffId } })).toBe(0);
  });
  it('enforces If-Match and preserves omitted fields during partial updates', async () => {
    await db.service.update({
      where: { id: serviceId },
      data: { capacity: 3, active: false, bufferBeforeMinutes: 7, depositAmount: 30 },
    });
    const r = await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${serviceId}`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ price: 110 });
    expect(r.status).toBe(200);
    expect(r.body.version).toBe(2);
    expect(r.body.capacity).toBe(3);
    expect(r.body.active).toBe(false);
    expect(r.body.bufferBeforeMinutes).toBe(7);
    expect(Number(r.body.depositAmount)).toBe(30);
    const stale = await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${serviceId}`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ price: 120 });
    expect(stale.status).toBe(412);
  });
  it('requires booking ownership and an idempotency key for guest payment', async () => {
    const body = { bookingId, amount: 30, method: 'QR' };
    expect(
      (
        await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('X-Booking-Token', guestToken)
          .send(body)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post('/api/v1/payments')
          .set('Idempotency-Key', key)
          .send(body)
      ).status,
    ).toBe(404);
    const create = () =>
      request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Idempotency-Key', key)
        .set('X-Booking-Token', guestToken)
        .send(body);
    const [first, second] = await Promise.all([create(), create()]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).toBe(second.body.id);
    paymentId = first.body.id;
    expect(await db.payment.count({ where: { bookingId } })).toBe(1);
    const mismatch = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Idempotency-Key', key)
      .set('X-Booking-Token', guestToken)
      .send({ ...body, amount: 20 });
    expect(mismatch.status).toBe(409);
  });
  it('rejects spoofed images and serves reencoded receipts privately', async () => {
    const bad = await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('If-Match', '1')
      .set('X-Booking-Token', guestToken)
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });
    expect(bad.status).toBe(400);
    const truncated = await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('If-Match', '1')
      .set('X-Booking-Token', guestToken)
      .attach('file', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), {
        filename: 'truncated.png',
        contentType: 'image/png',
      });
    expect(truncated.status).toBe(400);
    const oversized = await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('If-Match', '1')
      .set('X-Booking-Token', guestToken)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'oversized.png',
        contentType: 'image/png',
      });
    expect(oversized.status).toBe(413);
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    const upload = await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('If-Match', '1')
      .set('X-Booking-Token', guestToken)
      .attach('file', png, 'proof.png');
    expect(upload.status).toBe(201);
    expect(upload.body.receiptPath).toBeUndefined();
    expect(upload.body.receiptAvailable).toBe(true);
    expect(upload.body.version).toBe(2);
    expect(
      (await request(app.getHttpServer()).get(`/api/v1/payments/${paymentId}/receipt`)).status,
    ).toBe(404);
    const image = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}/receipt`)
      .set('X-Booking-Token', guestToken);
    expect(image.status).toBe(200);
    expect(image.type).toBe('image/webp');
    expect(image.headers['cache-control']).toBe('private, no-store');
  });
  it('confirms the deposit once and atomically confirms the booking', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/payments/${paymentId}/confirm`)
      .auth(adminToken, { type: 'bearer' })
      .set('If-Match', '2')
      .send({});
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CONFIRMED');
    expect((await db.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe(
      'CONFIRMED',
    );
    expect(
      await db.notification.count({ where: { event: 'BOOKING_CONFIRMED', userId: clientId } }),
    ).toBeGreaterThan(0);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/payments/${paymentId}/confirm`)
          .auth(adminToken, { type: 'bearer' })
          .set('If-Match', '2')
          .send({})
      ).status,
    ).toBe(412);
  });
  it('records partial manual refunds atomically and prevents replay or over-refund', async () => {
    const refundKey = randomUUID();
    const send = (amount: number, version: number, key = refundKey) =>
      request(app.getHttpServer())
        .patch(`/api/v1/payments/${paymentId}/refund`)
        .auth(adminToken, { type: 'bearer' })
        .set('If-Match', String(version))
        .set('Idempotency-Key', key)
        .send({ amount, reason: 'Devolución manual comprobada' });
    const [first, replay] = await Promise.all([send(10, 3), send(10, 3)]);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(first.body.refundId).toBe(replay.body.refundId);
    expect(Number(first.body.refundedAmount)).toBe(10);
    expect(first.body.remainingRefundable).toBe(20);
    expect(first.body.status).toBe('CONFIRMED');
    expect(await db.paymentRefund.count({ where: { paymentId } })).toBe(1);
    expect((await send(11, 3)).status).toBe(409);
    expect((await send(21, 4, randomUUID())).status).toBe(400);
    const completed = await send(20, 4, randomUUID());
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('REFUNDED');
    expect(completed.body.netAmount).toBe(0);
    expect(completed.body.remainingRefundable).toBe(0);
    expect((await send(1, 5, randomUUID())).status).toBe(409);
    const ledger = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}/refunds`)
      .auth(clientToken, { type: 'bearer' });
    expect(ledger.status).toBe(200);
    expect(ledger.body.items).toHaveLength(2);
    expect(ledger.body.items[0].recordedById).toBeUndefined();
    expect(
      (await request(app.getHttpServer()).get(`/api/v1/payments/${paymentId}/refunds`)).status,
    ).toBe(404);
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: bookingId } })).totalAmount.toNumber(),
    ).toBe(100);
    expect(
      await db.auditLog.count({
        where: { entityId: paymentId, action: 'PAYMENT_REFUND_RECORDED' },
      }),
    ).toBe(2);
  });
  it('permits reviews only after the owner completed the appointment', async () => {
    const review = () =>
      request(app.getHttpServer())
        .post('/api/v1/reviews')
        .auth(clientToken, { type: 'bearer' })
        .send({ bookingId, rating: 5, comment: 'Excelente atención' });
    expect((await review()).status).toBe(403);
    await db.booking.update({ where: { id: bookingId }, data: { status: 'COMPLETED' } });
    expect((await review()).status).toBe(201);
  });
});

describe('Notification adapters', () => {
  it('renders only known literal variables without evaluating expressions', () => {
    expect(
      renderTemplate('Hola {cliente}, {fecha}; ${process.env.SECRET}', {
        cliente: 'Ana',
        fecha: '26 de octubre',
      }),
    ).toBe('Hola Ana, 26 de octubre; ${process.env.SECRET}');
  });
  it('rejects private-network and arbitrary web-push destinations', () => {
    for (const endpoint of [
      'http://localhost/push',
      'https://127.0.0.1/push',
      'https://evil.example/push',
      'https://user:pass@fcm.googleapis.com/push',
    ])
      expect(() =>
        validateWebSubscription({ endpoint, keys: { p256dh: 'key', auth: 'auth' } }),
      ).toThrow();
  });
});
