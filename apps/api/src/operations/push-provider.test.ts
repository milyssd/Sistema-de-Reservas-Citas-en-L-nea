import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notification, PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import { PushProvider } from './delivery';
const base: Omit<Notification, 'channel'> = {
  id: 'notification-id',
  businessId: 'business-id',
  userId: 'user-id',
  subject: 'Tu cita',
  body: 'Cita confirmada',
  payload: { bookingId: 'booking-id' },
  createdAt: new Date(),
  recipient: 'user-id',
  event: 'BOOKING_CONFIRMED',
  status: 'PENDING',
  attempts: 0,
  maxAttempts: 5,
  scheduledAt: new Date(),
  lockedAt: null,
  sentAt: null,
  readAt: null,
  lastError: null,
};
const envKeys = [
  'EXPO_ACCESS_TOKEN',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
] as const;
const original = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});
function database(token: string) {
  const deviceToken = {
    findMany: vi.fn().mockResolvedValue([{ id: 'device-id', token }]),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  return { db: { deviceToken } as unknown as PrismaClient, deviceToken };
}
describe('External push provider contracts without live credentials', () => {
  it('sends Expo payload with scoped lookup and optional authenticated transport', async () => {
    const { db, deviceToken } = database('ExpoPushToken[test-token]');
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { status: 'ok', id: 'ticket' } }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetch);
    process.env.EXPO_ACCESS_TOKEN = 'synthetic-test-key';
    await new PushProvider(db).send({ ...base, channel: 'EXPO_PUSH' } as Notification);
    expect(deviceToken.findMany).toHaveBeenCalledWith({
      where: { businessId: base.businessId, userId: base.userId, channel: 'EXPO_PUSH' },
    });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(options.headers.Authorization).toBe('Bearer synthetic-test-key');
    expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body)).toMatchObject({
      to: 'ExpoPushToken[test-token]',
      data: { bookingId: 'booking-id' },
      title: 'Tu cita',
    });
  });
  it('removes unregistered Expo devices and propagates transient ticket errors for retry', async () => {
    const { db, deviceToken } = database('ExpoPushToken[test-token]');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { status: 'error', details: { error: 'DeviceNotRegistered' } } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { status: 'error', details: { error: 'MessageRateExceeded' } } }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetch);
    const provider = new PushProvider(db);
    await provider.send({ ...base, channel: 'EXPO_PUSH' } as Notification);
    expect(deviceToken.deleteMany).toHaveBeenCalledWith({ where: { id: 'device-id' } });
    await expect(provider.send({ ...base, channel: 'EXPO_PUSH' } as Notification)).rejects.toThrow(
      'EXPO_DELIVERY_FAILED',
    );
  });
  it('sends Web Push with VAPID and handles expired subscriptions', async () => {
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: { p256dh: 'synthetic-key', auth: 'synthetic-auth' },
    };
    const { db, deviceToken } = database(JSON.stringify(subscription));
    process.env.VAPID_PUBLIC_KEY = 'synthetic-public';
    process.env.VAPID_PRIVATE_KEY = 'synthetic-private';
    process.env.VAPID_SUBJECT = 'mailto:ops@example.test';
    const send = vi
      .spyOn(webpush, 'sendNotification')
      .mockResolvedValueOnce({ statusCode: 201, body: '', headers: {} })
      .mockRejectedValueOnce({ statusCode: 410 });
    const provider = new PushProvider(db);
    await provider.send({ ...base, channel: 'WEB_PUSH' } as Notification);
    expect(send).toHaveBeenCalledWith(
      subscription,
      expect.stringContaining('booking-id'),
      expect.objectContaining({
        TTL: 3600,
        timeout: 15000,
        vapidDetails: {
          subject: 'mailto:ops@example.test',
          publicKey: 'synthetic-public',
          privateKey: 'synthetic-private',
        },
      }),
    );
    await provider.send({ ...base, channel: 'WEB_PUSH' } as Notification);
    expect(deviceToken.deleteMany).toHaveBeenCalledWith({ where: { id: 'device-id' } });
  });
});
