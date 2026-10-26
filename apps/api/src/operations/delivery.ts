import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import webpush from 'web-push';
import { Notification, PrismaClient } from '@prisma/client';

export interface NotificationProvider {
  send(notification: Notification): Promise<void>;
}
export class SmtpProvider implements NotificationProvider {
  async send(job: Notification) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error('SMTP_NOT_CONFIGURED');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      requireTLS: process.env.SMTP_SECURE !== 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      ...(process.env.SMTP_CA_FILE
        ? {
            tls: {
              ca: readFileSync(process.env.SMTP_CA_FILE),
              ...(process.env.SMTP_TLS_SERVERNAME
                ? { servername: process.env.SMTP_TLS_SERVERNAME }
                : {}),
            },
          }
        : {}),
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: job.recipient,
      subject: job.subject,
      text: job.body,
      headers: { 'X-Notification-ID': job.id },
      messageId: `<${job.id}@${new URL(process.env.WEB_ORIGIN ?? 'http://localhost:3000').hostname}>`,
    });
  }
}
export const allowedPushHosts = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'wns2-db5p.notify.windows.com',
]);
export function validateWebSubscription(value: unknown): webpush.PushSubscription {
  const subscription = value as webpush.PushSubscription;
  if (
    !subscription ||
    typeof subscription.endpoint !== 'string' ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== 'string' ||
    typeof subscription.keys.auth !== 'string'
  )
    throw new Error('INVALID_PUSH_SUBSCRIPTION');
  const url = new URL(subscription.endpoint);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !allowedPushHosts.has(url.hostname)
  )
    throw new Error('PUSH_DESTINATION_NOT_ALLOWED');
  if (
    subscription.keys.p256dh.length > 256 ||
    subscription.keys.auth.length > 256 ||
    subscription.endpoint.length > 2000
  )
    throw new Error('INVALID_PUSH_SUBSCRIPTION');
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  };
}
export class PushProvider implements NotificationProvider {
  constructor(private readonly db: PrismaClient) {}
  async send(job: Notification) {
    if (!job.userId) return;
    const devices = await this.db.deviceToken.findMany({
      where: { businessId: job.businessId, userId: job.userId, channel: job.channel },
    });
    for (const device of devices) {
      if (job.channel === 'EXPO_PUSH') {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(process.env.EXPO_ACCESS_TOKEN
              ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({
            to: device.token,
            title: job.subject,
            body: job.body,
            data: job.payload,
            sound: 'default',
          }),
          signal: AbortSignal.timeout(15000),
          redirect: 'error',
        });
        if (!response.ok) throw new Error('EXPO_DELIVERY_FAILED');
        const result = (await response.json()) as {
          data?: { status?: string; details?: { error?: string } };
        };
        if (result.data?.status !== 'ok') {
          if (result.data?.details?.error === 'DeviceNotRegistered')
            await this.db.deviceToken.deleteMany({ where: { id: device.id } });
          else throw new Error('EXPO_DELIVERY_FAILED');
        }
      } else {
        if (
          !process.env.VAPID_PUBLIC_KEY ||
          !process.env.VAPID_PRIVATE_KEY ||
          !process.env.VAPID_SUBJECT
        )
          throw new Error('WEB_PUSH_NOT_CONFIGURED');
        try {
          await webpush.sendNotification(
            validateWebSubscription(JSON.parse(device.token)),
            JSON.stringify({ title: job.subject, body: job.body, data: job.payload }),
            {
              vapidDetails: {
                subject: process.env.VAPID_SUBJECT,
                publicKey: process.env.VAPID_PUBLIC_KEY,
                privateKey: process.env.VAPID_PRIVATE_KEY,
              },
              TTL: 3600,
              timeout: 15000,
            },
          );
        } catch (error) {
          if ((error as { statusCode?: number }).statusCode === 410)
            await this.db.deviceToken.deleteMany({ where: { id: device.id } });
          else throw error;
        }
      }
    }
  }
}
