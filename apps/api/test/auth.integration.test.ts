import 'reflect-metadata';
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { CommonModule } from '../src/common/common.module';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { ProblemFilter } from '../src/common/problem.filter';
import { PrismaService } from '../src/common/prisma.service';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;
describeDatabase('Auth integration against MySQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID();
  const email = `integration-${suffix}@example.test`;
  const password = 'IntegrationPassword24!';
  let userId: string;
  let accessToken: string;
  let refreshToken: string;
  let otherId: string;
  let otherAccess: string;
  let claimedUserId: string;
  const previousNamespace = process.env.RATE_LIMIT_NAMESPACE;
  beforeAll(async () => {
    process.env.RATE_LIMIT_NAMESPACE = `reservas:rate:auth-test:${suffix}`;
    const module = await Test.createTestingModule({
      imports: [CommonModule, AuthModule, UsersModule],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.use((req: { id: string }, _res: unknown, next: () => void) => {
      req.id = randomUUID();
      next();
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ProblemFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    if (prisma) {
      const ids = [userId, otherId, claimedUserId].filter(Boolean);
      if (ids.length) {
        await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
        await prisma.customer.deleteMany({ where: { userId: { in: ids } } });
        await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    }
    if (app) await app.close();
    if (previousNamespace === undefined) delete process.env.RATE_LIMIT_NAMESPACE;
    else process.env.RATE_LIMIT_NAMESPACE = previousNamespace;
  });
  it('strict validation rejects privilege escalation and short passwords', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'short', name: 'Prueba', phone: '+59170123456', role: 'OWNER' });
    const malformed = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{invalid');
    expect(malformed.status).toBe(400);
    expect(response.status).toBe(400);
    expect(response.type).toBe('application/problem+json');
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.requestId).toBeTruthy();
  });
  it('registers with hashed password and issues a mobile session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, name: 'Prueba API', phone: '+59170123456', platform: 'mobile' });
    expect(
      response.status,
      response.status === 201 ? undefined : JSON.stringify(response.body),
    ).toBe(201);
    expect(response.body.user.role).toBe('CLIENT');
    ({ accessToken, refreshToken } = response.body);
    userId = response.body.user.id;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    const session = await prisma.refreshSession.findFirstOrThrow({ where: { userId } });
    expect(session.tokenHash).not.toBe(refreshToken);
    expect(session.tokenHash).toHaveLength(64);
  });
  it('enforces roles and keeps tokens outside profile responses', async () => {
    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(accessToken, { type: 'bearer' });
    expect(profile.status).toBe(200);
    expect(profile.body.id).toBe(userId);
    expect(profile.body.passwordHash).toBeUndefined();
    const users = await request(app.getHttpServer())
      .get('/api/v1/users')
      .auth(accessToken, { type: 'bearer' });
    expect(users.status).toBe(403);
    const unauthenticated = await request(app.getHttpServer()).get('/api/v1/users/me');
    expect(unauthenticated.status).toBe(401);
  });
  it('verifies email with a one-use expiring token', async () => {
    const message = await prisma.notification.findFirstOrThrow({
      where: { userId, event: 'VERIFY_EMAIL' },
    });
    const token = new URL(message.body.split(' ').at(-1)!).searchParams.get('token');
    const verified = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token });
    expect(verified.status).toBe(200);
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token });
    expect(replay.status).toBe(400);
  });
  it('rotates refresh tokens and revokes the family upon reuse', async () => {
    const next = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ platform: 'mobile', refreshToken });
    expect(next.status).toBe(200);
    expect(next.body.refreshToken).not.toBe(refreshToken);
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ platform: 'mobile', refreshToken });
    expect(replay.status).toBe(401);
    const revoked = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(next.body.accessToken, { type: 'bearer' });
    expect(revoked.status).toBe(401);
  });
  it('uses httpOnly web cookies and rejects CSRF refresh', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.refreshToken).toBeUndefined();
    const cookie = login.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    const csrf = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.example')
      .send({});
    expect(csrf.status).toBe(403);
    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .set('Origin', process.env.WEB_ORIGIN ?? 'http://localhost:3000')
      .set('X-Requested-With', 'reservas-client')
      .send({});
    expect(refresh.status).toBe(200);
    accessToken = refresh.body.accessToken;
  });
  it('prevents session IDOR and stale optimistic profile updates', async () => {
    const other = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `other-${suffix}@example.test`,
        password,
        name: 'Otra cuenta',
        phone: '+59170123457',
        platform: 'mobile',
      });
    expect(other.status).toBe(201);
    otherId = other.body.user.id;
    otherAccess = other.body.accessToken;
    const session = await prisma.refreshSession.findFirstOrThrow({
      where: { userId: otherId, revokedAt: null },
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${session.id}`)
      .auth(accessToken, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(otherAccess, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .auth(accessToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ name: 'Nombre actualizado' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .auth(accessToken, { type: 'bearer' })
      .set('If-Match', '1')
      .send({ name: 'Nombre antiguo' })
      .expect(409);
  });
  it('does not expose existing guest history until email ownership is verified', async () => {
    const guestEmail = `guest-${suffix}@example.test`;
    const guest = await prisma.customer.create({
      data: {
        businessId: process.env.BUSINESS_ID!,
        email: guestEmail,
        name: 'Cliente invitado',
        phone: '+59170123458',
        internalNotes: 'No revelar antes de verificar correo',
      },
    });
    const registration = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: guestEmail,
      password,
      name: 'Nueva cuenta',
      phone: '+59170123459',
      platform: 'mobile',
    });
    expect(registration.status).toBe(201);
    claimedUserId = registration.body.user.id;
    const before = await request(app.getHttpServer())
      .get('/api/v1/users/me/export')
      .auth(registration.body.accessToken, { type: 'bearer' });
    expect(before.status).toBe(200);
    expect(before.body.customer).toBeNull();
    expect(before.body.bookings).toEqual([]);
    const message = await prisma.notification.findFirstOrThrow({
      where: { userId: claimedUserId, event: 'VERIFY_EMAIL' },
    });
    const token = new URL(message.body.split(' ').at(-1)!).searchParams.get('token');
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(200);
    const after = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(registration.body.accessToken, { type: 'bearer' });
    expect(after.body.customerId).toBe(guest.id);
  });
  it('password recovery is generic, single-use, and invalidates active sessions', async () => {
    const generic = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: `missing-${suffix}@example.test` });
    const existing = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email });
    expect(existing.body).toEqual(generic.body);
    const message = await prisma.notification.findFirstOrThrow({
      where: { userId, event: 'RESET_PASSWORD' },
    });
    const token = new URL(message.body.split(' ').at(-1)!).searchParams.get('token');
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NewIntegrationPassword24!' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, password })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(401);
  });
});
