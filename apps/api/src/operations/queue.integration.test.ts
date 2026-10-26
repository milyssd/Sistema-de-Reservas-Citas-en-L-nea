import 'reflect-metadata';
import 'dotenv/config';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SMTPServer } from 'smtp-server';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { NotificationDelivery } from './notification-delivery';
import {
  BullMqNotificationQueue,
  DatabaseNotificationQueue,
  dispatchOutbox,
  redisOptions,
} from './notification-queue';
import { SmtpProvider } from './delivery';
import { renderTemplate } from './notifications';
import { scheduleNotificationTick } from './worker';
const database = process.env.DATABASE_URL ? describe : describe.skip;
const redis = process.env.DATABASE_URL && process.env.REDIS_URL ? describe : describe.skip;
async function until(predicate: () => Promise<boolean>, timeout = 10000) {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > timeout) throw new Error('Condition timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

redis('BullMQ durable delivery with real Redis and MySQL', () => {
  let db: PrismaService, businessId: string;
  const queues: { adapter: BullMqNotificationQueue; prefix: string }[] = [];
  beforeAll(async () => {
    db = new PrismaService();
    businessId = (
      await db.business.create({ data: { name: 'BullMQ test', slug: `queue-${randomUUID()}` } })
    ).id;
  });
  afterEach(async () => {
    for (const { adapter, prefix } of queues.splice(0)) {
      await adapter.close();
      const cleanup = new Queue('notifications', {
        prefix,
        connection: redisOptions(process.env.REDIS_URL!),
      });
      await cleanup.obliterate({ force: true });
      await cleanup.close();
    }
  });
  afterAll(async () => {
    if (businessId) {
      await db.notification.deleteMany({ where: { businessId } });
      await db.business.delete({ where: { id: businessId } });
    }
    if (db) await db.$disconnect();
  });
  const makeJob = () =>
    db.notification.create({
      data: {
        businessId,
        recipient: 'in-app',
        channel: 'IN_APP',
        event: 'TEST',
        subject: 'Test',
        body: 'Test',
        maxAttempts: 3,
      },
    });
  const start = async (delivery: NotificationDelivery) => {
    const prefix = `test-${randomUUID()}`;
    const adapter = new BullMqNotificationQueue(delivery, process.env.REDIS_URL!, {
      prefix,
      concurrency: 2,
    });
    queues.push({ adapter, prefix });
    await adapter.start();
    return adapter;
  };
  it('deduplicates simultaneous dispatches and writes one successful delivery record', async () => {
    let sends = 0;
    const delivery = new NotificationDelivery(
      db,
      {
        IN_APP: {
          async send() {
            sends++;
          },
        },
      },
      { backoffMs: 20 },
    );
    const queue = await start(delivery);
    const job = await makeJob();
    await Promise.all([queue.enqueue(job), queue.enqueue(job), queue.enqueue(job)]);
    await until(
      async () =>
        (await db.notification.findUniqueOrThrow({ where: { id: job.id } })).status === 'SENT',
    );
    const row = await db.notification.findUniqueOrThrow({ where: { id: job.id } });
    expect(row.attempts).toBe(1);
    expect(sends).toBe(1);
    expect(row.sentAt).toBeTruthy();
  });
  it('retries transport failures with backoff while MySQL keeps attempt and delivery state', async () => {
    let sends = 0;
    const delivery = new NotificationDelivery(
      db,
      {
        IN_APP: {
          async send() {
            if (++sends === 1) throw new Error('Temporary failure');
          },
        },
      },
      { backoffMs: 25 },
    );
    const queue = await start(delivery);
    const job = await makeJob();
    await queue.enqueue(job);
    await until(
      async () =>
        (await db.notification.findUniqueOrThrow({ where: { id: job.id } })).status === 'SENT',
    );
    const row = await db.notification.findUniqueOrThrow({ where: { id: job.id } });
    expect(row.attempts).toBe(2);
    expect(sends).toBe(2);
    expect(row.lastError).toBeNull();
  });
  it('recovers a MySQL outbox row when the Redis job is absent or its old process died', async () => {
    const delivery = new NotificationDelivery(
      db,
      { IN_APP: { async send() {} } },
      { backoffMs: 20 },
    );
    const queue = await start(delivery);
    const job = await makeJob();
    await db.notification.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', attempts: 1, lockedAt: new Date(Date.now() - 10 * 60000) },
    });
    await dispatchOutbox(delivery, queue, businessId);
    await until(
      async () =>
        (await db.notification.findUniqueOrThrow({ where: { id: job.id } })).status === 'SENT',
    );
    expect((await db.notification.findUniqueOrThrow({ where: { id: job.id } })).attempts).toBe(2);
  });
  it('stops after the configured attempts instead of redelivering failed jobs forever', async () => {
    const delivery = new NotificationDelivery(
      db,
      {
        IN_APP: {
          async send() {
            throw new Error('Unavailable');
          },
        },
      },
      { backoffMs: 20 },
    );
    const queue = await start(delivery);
    const job = await makeJob();
    await queue.enqueue(job);
    await until(
      async () =>
        (await db.notification.findUniqueOrThrow({ where: { id: job.id } })).status === 'FAILED',
    );
    await dispatchOutbox(delivery, queue, businessId);
    expect((await db.notification.findUniqueOrThrow({ where: { id: job.id } })).attempts).toBe(3);
  });
});

database('MySQL/node-cron fallback and verified SMTP transport', () => {
  let db: PrismaService, businessId: string, server: SMTPServer, certDir: string;
  const keys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_FROM',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_CA_FILE',
    'SMTP_TLS_SERVERNAME',
  ] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const messages: string[] = [];
  let refuseNext = false;
  beforeAll(async () => {
    db = new PrismaService();
    businessId = (
      await db.business.create({ data: { name: 'SMTP test', slug: `smtp-${randomUUID()}` } })
    ).id;
    certDir = await mkdtemp(path.join(os.tmpdir(), 'reservas-smtp-test-'));
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-keyout',
        path.join(certDir, 'key.pem'),
        '-out',
        path.join(certDir, 'cert.pem'),
        '-subj',
        '/CN=localhost',
        '-addext',
        'subjectAltName=DNS:localhost,IP:127.0.0.1',
      ],
      { stdio: 'ignore' },
    );
    server = new SMTPServer({
      secure: true,
      key: await readFile(path.join(certDir, 'key.pem')),
      cert: await readFile(path.join(certDir, 'cert.pem')),
      authOptional: true,
      disabledCommands: ['AUTH'],
      disableReverseLookup: true,
      onData(stream, _session, callback) {
        let text = '';
        stream.on('data', (chunk) => {
          text += chunk.toString();
        });
        stream.on('end', () => {
          messages.push(text);
          if (refuseNext) {
            refuseNext = false;
            callback(Object.assign(new Error('Try again'), { responseCode: 451 }));
          } else callback();
        });
      },
    });
    server.on('error', () => undefined);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.server.address();
    if (!address || typeof address === 'string') throw new Error('SMTP server did not listen');
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(address.port);
    process.env.SMTP_SECURE = 'true';
    process.env.SMTP_FROM = 'reservas@example.test';
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    process.env.SMTP_CA_FILE = path.join(certDir, 'cert.pem');
    process.env.SMTP_TLS_SERVERNAME = 'localhost';
  }, 15000);
  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(resolve));
    if (businessId) {
      await db.notification.deleteMany({ where: { businessId } });
      await db.business.delete({ where: { id: businessId } });
    }
    if (db) await db.$disconnect();
    if (certDir) await rm(certDir, { recursive: true, force: true });
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
  it('uses node-cron and database claims without any Redis dependency', async () => {
    let sends = 0;
    const delivery = new NotificationDelivery(db, {
      IN_APP: {
        async send() {
          sends++;
        },
      },
    });
    const queue = new DatabaseNotificationQueue(delivery);
    const job = await db.notification.create({
      data: {
        businessId,
        recipient: 'in-app',
        channel: 'IN_APP',
        event: 'CRON',
        subject: 'Cron',
        body: 'Cron',
      },
    });
    await queue.start();
    const task = scheduleNotificationTick(async () => {
      await dispatchOutbox(delivery, queue, businessId);
    }, '* * * * * *');
    try {
      await until(
        async () =>
          (await db.notification.findUniqueOrThrow({ where: { id: job.id } })).status === 'SENT',
        4000,
      );
    } finally {
      await task.stop();
      await task.destroy();
      await queue.close();
    }
    expect(sends).toBe(1);
  });
  it('validates TLS, sends rendered templates to an actual SMTP server, and retries temporary rejection', async () => {
    const job = await db.notification.create({
      data: {
        businessId,
        recipient: 'marina@example.test',
        channel: 'EMAIL',
        event: 'BOOKING_CONFIRMED',
        subject: renderTemplate('Reserva {codigo}', { codigo: 'AB12CD34' }),
        body: renderTemplate('Hola {cliente}. Tu cita es el {fecha} a las {hora}.', {
          cliente: 'Marina',
          fecha: '26 de octubre',
          hora: '10:00',
        }),
      },
    });
    const caFile = process.env.SMTP_CA_FILE;
    delete process.env.SMTP_CA_FILE;
    await expect(new SmtpProvider().send(job)).rejects.toBeTruthy();
    expect(messages).toHaveLength(0);
    process.env.SMTP_CA_FILE = caFile;
    refuseNext = true;
    const delivery = new NotificationDelivery(db, { EMAIL: new SmtpProvider() }, { backoffMs: 25 });
    expect((await delivery.deliver(job.id, businessId)).state).toBe('retry');
    const retry = await db.notification.findUniqueOrThrow({ where: { id: job.id } });
    expect(retry.status).toBe('PENDING');
    expect(retry.attempts).toBe(1);
    await until(async () => Date.now() >= retry.scheduledAt.getTime());
    expect((await delivery.deliver(job.id, businessId)).state).toBe('sent');
    expect(messages).toHaveLength(2);
    expect(messages[1]).toContain('Subject: Reserva AB12CD34');
    expect(messages[1]).toContain('Hola Marina. Tu cita es el 26 de octubre a las 10:00.');
    expect(messages[1]).toContain(`X-Notification-ID: ${job.id}`);
    expect((await db.notification.findUniqueOrThrow({ where: { id: job.id } })).attempts).toBe(2);
  });
});
