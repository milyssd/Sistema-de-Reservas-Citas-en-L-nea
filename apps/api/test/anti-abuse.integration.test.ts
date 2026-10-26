import 'reflect-metadata';
import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CommonModule } from '../src/common/common.module';
import { ProblemFilter } from '../src/common/problem.filter';
import { PrismaService } from '../src/common/prisma.service';
import { BookingsModule } from '../src/bookings/bookings.module';
import { AntiAbuseService } from '../src/anti-abuse/anti-abuse.service';
import { ProofChallenge, decodeProof, signProof } from '../src/anti-abuse/proof';

const businessId = randomUUID(),
  locationId = randomUUID(),
  staffId = randomUUID(),
  serviceId = randomUUID();
const start = new Date();
start.setUTCDate(start.getUTCDate() + 3);
start.setUTCHours(14, 0, 0, 0);
const payload = (minutes = 0) => ({
  locationId,
  staffId,
  serviceIds: [serviceId],
  startAt: new Date(start.getTime() + minutes * 60000).toISOString(),
});
const solve = ({ token, difficulty }: ProofChallenge) => {
  for (let nonce = 0; nonce < 2_000_000; nonce++) {
    if (
      createHash('sha256').update(`${token}:${nonce}`).digest().readUInt32BE(0) >>>
        (32 - difficulty) ===
      0
    )
      return String(nonce);
  }
  throw new Error('No proof within bounded test budget');
};
const code = async (operation: Promise<unknown>, expected: string) => {
  try {
    await operation;
    throw new Error('Expected rejection');
  } catch (error) {
    expect((error as { getResponse: () => { code: string } }).getResponse().code).toBe(expected);
  }
};

describe.skipIf(process.env.RUN_INTEGRATION !== '1')(
  'Adaptive guest proof with real database and booking endpoints',
  () => {
    let app: INestApplication, db: PrismaService, anti: AntiAbuseService;
    const previous = Object.fromEntries(
      ['BUSINESS_ID', 'RATE_LIMIT_NAMESPACE', 'GUEST_POW_AFTER', 'GUEST_POW_DIFFICULTY'].map(
        (key) => [key, process.env[key]],
      ),
    );
    beforeAll(async () => {
      process.env.BUSINESS_ID = businessId;
      process.env.RATE_LIMIT_NAMESPACE = `reservas:pow-test:${businessId}`;
      process.env.GUEST_POW_AFTER = '2';
      process.env.GUEST_POW_DIFFICULTY = '12';
      const module = await Test.createTestingModule({
        imports: [CommonModule, BookingsModule],
      }).compile();
      app = module.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalFilters(new ProblemFilter());
      app.use((req: { id: string }, _res: unknown, next: () => void) => {
        req.id = randomUUID();
        next();
      });
      await app.init();
      db = app.get(PrismaService);
      anti = app.get(AntiAbuseService);
      await db.business.create({
        data: {
          id: businessId,
          name: 'Prueba antiabuso',
          slug: `pow-${businessId}`,
          minimumNoticeMinutes: 0,
          maxPendingBookings: 20,
        },
      });
      await db.location.create({
        data: { id: locationId, businessId, name: 'Sede prueba', address: 'Datos sintéticos' },
      });
      await db.staff.create({
        data: { id: staffId, businessId, locationId, name: 'Recurso prueba' },
      });
      await db.service.create({
        data: {
          id: serviceId,
          businessId,
          name: 'Servicio prueba',
          durationMinutes: 30,
          price: 50,
        },
      });
      await db.staffService.create({ data: { businessId, staffId, serviceId } });
      await db.workingHours.createMany({
        data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          businessId,
          locationId,
          staffId,
          dayOfWeek,
          startMinute: 0,
          endMinute: 1440,
        })),
      });
    });
    afterAll(async () => {
      if (db) {
        await db.notification.deleteMany({ where: { businessId } });
        await db.auditLog.deleteMany({ where: { businessId } });
        await db.reminder.deleteMany({ where: { businessId } });
        await db.booking.deleteMany({ where: { businessId } });
        await db.customer.deleteMany({ where: { businessId } });
        await db.hold.deleteMany({ where: { businessId } });
        await db.idempotencyRecord.deleteMany({ where: { businessId } });
        await db.workingHours.deleteMany({ where: { businessId } });
        await db.staffService.deleteMany({ where: { businessId } });
        await db.service.deleteMany({ where: { businessId } });
        await db.staff.deleteMany({ where: { businessId } });
        await db.location.deleteMany({ where: { businessId } });
        await db.business.deleteMany({ where: { id: businessId } });
      }
      if (app) await app.close();
      for (const [key, value] of Object.entries(previous))
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    });
    it('leaves normal guest traffic frictionless and requires proof only after the shared threshold', async () => {
      await request(app.getHttpServer()).post('/api/v1/bookings/holds').send(payload()).expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/bookings/holds')
        .send(payload(30))
        .expect(201);
      const blocked = await request(app.getHttpServer())
        .post('/api/v1/bookings/holds')
        .send(payload(60));
      expect(blocked.status).toBe(403);
      expect(blocked.type).toBe('application/problem+json');
      expect(blocked.body.code).toBe('GUEST_CHALLENGE_REQUIRED');
      expect(blocked.body.requestId).toBeTruthy();
      const challenge: ProofChallenge = blocked.body.challenge;
      const nonce = solve(challenge);
      await request(app.getHttpServer())
        .post('/api/v1/bookings/holds')
        .set('X-Guest-Challenge', challenge.token)
        .set('X-Guest-Nonce', nonce)
        .send(payload(60))
        .expect(201);
      const replay = await request(app.getHttpServer())
        .post('/api/v1/bookings/holds')
        .set('X-Guest-Challenge', challenge.token)
        .set('X-Guest-Nonce', nonce)
        .send(payload(60));
      expect(replay.status).toBe(403);
      expect(replay.body.code).toBe('GUEST_PROOF_REPLAYED');
    });
    it('keeps booking retries idempotent after consuming the proof once', async () => {
      const body = {
          ...payload(120),
          customer: {
            name: 'Cliente prueba',
            phone: '+59170123456',
            email: `proof-${businessId}@example.test`,
          },
        },
        key = randomUUID();
      const blocked = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Idempotency-Key', key)
        .send(body);
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('GUEST_CHALLENGE_REQUIRED');
      const challenge: ProofChallenge = blocked.body.challenge,
        nonce = solve(challenge);
      const send = () =>
        request(app.getHttpServer())
          .post('/api/v1/bookings')
          .set('Idempotency-Key', key)
          .set('X-Guest-Challenge', challenge.token)
          .set('X-Guest-Nonce', nonce)
          .send(body);
      const first = await send(),
        second = await send();
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.id).toBe(second.body.id);
      expect(await db.booking.count({ where: { businessId } })).toBe(1);
    });
    it('rejects wrong IP, changed payload, changed action, and changed idempotency key', async () => {
      const ip = '203.0.113.10',
        key = randomUUID(),
        body = payload(180),
        challenge = await anti.issue('BOOK', body, ip, key),
        nonce = solve(challenge);
      await code(
        anti.verifyAndConsume(challenge.token, nonce, 'BOOK', body, '203.0.113.11', key),
        'GUEST_PROOF_INVALID',
      );
      await code(
        anti.verifyAndConsume(challenge.token, nonce, 'BOOK', payload(195), ip, key),
        'GUEST_PROOF_INVALID',
      );
      await code(
        anti.verifyAndConsume(challenge.token, nonce, 'HOLD', body, ip, key),
        'GUEST_PROOF_INVALID',
      );
      await code(
        anti.verifyAndConsume(challenge.token, nonce, 'BOOK', body, ip, randomUUID()),
        'GUEST_PROOF_INVALID',
      );
      const foreignToken = signProof(
        { ...decodeProof(challenge.token, process.env.JWT_SECRET!)!, businessId: randomUUID() },
        process.env.JWT_SECRET!,
      );
      await code(
        anti.verifyAndConsume(
          foreignToken,
          solve({ ...challenge, token: foreignToken }),
          'BOOK',
          body,
          ip,
          key,
        ),
        'GUEST_PROOF_INVALID',
      );
      await anti.verifyAndConsume(challenge.token, nonce, 'BOOK', body, ip, key);
    });
    it('rejects expired proofs without consuming them', async () => {
      const ip = '203.0.113.12',
        body = payload(210),
        challenge = await anti.issue('HOLD', body, ip),
        nonce = solve(challenge);
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(challenge.expiresAt) + 1000);
      try {
        await code(
          anti.verifyAndConsume(challenge.token, nonce, 'HOLD', body, ip),
          'GUEST_PROOF_EXPIRED',
        );
      } finally {
        clock.mockRestore();
      }
      const claims = decodeProof(challenge.token, process.env.JWT_SECRET!)!;
      expect(
        await db.idempotencyRecord.count({
          where: { businessId, scope: 'guest-proof', key: claims.jti },
        }),
      ).toBe(0);
    });
    it('allows only one concurrent proof consumption across API instances', async () => {
      const ip = '203.0.113.13',
        body = payload(240),
        challenge = await anti.issue('HOLD', body, ip),
        nonce = solve(challenge);
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          anti.verifyAndConsume(challenge.token, nonce, 'HOLD', body, ip),
        ),
      );
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      for (const result of results)
        if (result.status === 'rejected')
          expect(result.reason.getResponse().code).toBe('GUEST_PROOF_REPLAYED');
    });
    it('does not challenge identities already authenticated by the API guard', async () => {
      for (let index = 0; index < 5; index++)
        await anti.assertGuest(
          { ip: '203.0.113.14', headers: {}, user: { id: randomUUID() } },
          'HOLD',
          payload(270),
        );
    });
    it('validates explicit challenges and rate limits their issuance', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/anti-abuse/challenge')
        .send({ action: 'HOLD', payload: { ...payload(), businessId: randomUUID() } })
        .expect(400);
      const successful = await request(app.getHttpServer())
        .post('/api/v1/anti-abuse/challenge')
        .send({ action: 'HOLD', payload: payload(300) });
      expect(successful.status).toBe(201);
      expect(successful.body.algorithm).toBe('SHA-256');
      let limited = false;
      for (let index = 0; index < 13; index++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/anti-abuse/challenge')
          .send({ action: 'HOLD', payload: payload(300) });
        if (response.status === 429) {
          expect(response.body.code).toBe('RATE_LIMITED');
          limited = true;
          break;
        }
        expect(response.status).toBe(201);
      }
      expect(limited).toBe(true);
    });
  },
);
