import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { Actor } from './operations.service';
import {
  deviceSchema,
  idSchema,
  pageSchema,
  parse,
  reviewSchema,
  waitlistSchema,
} from './validation';
import { validateWebSubscription } from './delivery';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const icsEscape = (value: string) =>
  value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
const icsDate = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
@Injectable()
export class CommunityService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async notifications(query: unknown, user: Actor, outbox = false) {
    const { cursor, limit } = parse(pageSchema, query);
    const items = await this.db.notification.findMany({
      where: {
        businessId: user.businessId,
        ...(outbox ? {} : { userId: user.id, channel: 'IN_APP' as const }),
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: outbox
        ? {
            id: true,
            event: true,
            channel: true,
            status: true,
            attempts: true,
            maxAttempts: true,
            scheduledAt: true,
            sentAt: true,
            lastError: true,
            createdAt: true,
          }
        : {
            id: true,
            event: true,
            subject: true,
            body: true,
            payload: true,
            readAt: true,
            createdAt: true,
          },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { items, nextCursor: more ? items.at(-1)?.id : null };
  }
  async retryNotification(id: string, user: Actor) {
    parse(idSchema, id);
    return this.db.$transaction(async (tx) => {
      const result = await tx.notification.updateMany({
        where: { id, businessId: user.businessId, status: { in: ['FAILED', 'PENDING'] } },
        data: {
          status: 'PENDING',
          attempts: 0,
          lockedAt: null,
          lastError: null,
          scheduledAt: new Date(),
        },
      });
      if (!result.count)
        throw new ConflictException(
          'La notificación no existe, está en proceso o ya fue entregada',
        );
      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          action: 'NOTIFICATION_RETRIED',
          entityType: 'Notification',
          entityId: id,
        },
      });
      return { queued: true };
    });
  }
  async readNotification(id: string, user: Actor) {
    const result = await this.db.notification.updateMany({
      where: {
        id: parse(idSchema, id),
        businessId: user.businessId,
        userId: user.id,
        channel: 'IN_APP',
      },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException();
    return { read: true };
  }
  async device(body: unknown, user: Actor) {
    const data = parse(deviceSchema, body);
    if (data.platform === 'WEB') {
      try {
        validateWebSubscription(JSON.parse(data.token));
      } catch {
        throw new BadRequestException('Suscripción push inválida');
      }
    } else if (!/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(data.token))
      throw new BadRequestException('Token Expo inválido');
    const tokenHash = hash(data.token),
      businessId = user.businessId;
    const row = await this.db.deviceToken.upsert({
      where: { businessId_tokenHash: { businessId, tokenHash } },
      create: {
        businessId,
        userId: user.id,
        channel: data.platform === 'WEB' ? 'WEB_PUSH' : 'EXPO_PUSH',
        token: data.token,
        tokenHash,
      },
      update: { userId: user.id, token: data.token },
      select: { id: true, channel: true },
    });
    return row;
  }
  async removeDevice(id: string, user: Actor) {
    await this.db.deviceToken.deleteMany({
      where: { id: parse(idSchema, id), businessId: user.businessId, userId: user.id },
    });
    return { deleted: true };
  }
  async joinWaitlist(body: unknown, user: Actor) {
    const data = parse(waitlistSchema, body),
      businessId = user.businessId;
    const customer = await this.db.customer.findFirst({ where: { businessId, userId: user.id } });
    if (!customer || customer.blocked)
      throw new ForbiddenException('El perfil de cliente no admite reservas');
    const [service, location, staff, count] = await Promise.all([
      this.db.service.findFirst({
        where: { id: data.serviceId, businessId, active: true, onlineBookable: true },
      }),
      this.db.location.findFirst({ where: { id: data.locationId, businessId, active: true } }),
      data.staffId
        ? this.db.staff.findFirst({
            where: {
              id: data.staffId,
              businessId,
              locationId: data.locationId,
              active: true,
              staffServices: { some: { serviceId: data.serviceId } },
            },
          })
        : true,
      this.db.waitlistEntry.count({
        where: { businessId, customerId: customer.id, status: 'WAITING' },
      }),
    ]);
    if (!service || !location || !staff || Date.parse(data.to) <= Date.now())
      throw new BadRequestException('Servicio, sede o período inválido');
    if (count >= 10) throw new ConflictException('Ya tienes diez solicitudes en espera');
    return this.db.waitlistEntry.create({
      data: {
        ...data,
        businessId,
        customerId: customer.id,
        from: new Date(data.from),
        to: new Date(data.to),
      },
    });
  }
  async waitlist(query: unknown, user: Actor) {
    const { cursor, limit } = parse(pageSchema, query);
    const items = await this.db.waitlistEntry.findMany({
      where: {
        businessId: user.businessId,
        customer: { userId: user.id },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { items, nextCursor: more ? items.at(-1)?.id : null };
  }
  async leaveWaitlist(id: string, version: number, user: Actor) {
    const result = await this.db.waitlistEntry.updateMany({
      where: {
        id: parse(idSchema, id),
        businessId: user.businessId,
        customer: { userId: user.id },
        version,
      },
      data: { status: 'CANCELLED', version: { increment: 1 } },
    });
    if (!result.count)
      throw new PreconditionFailedException('Solicitud no encontrada o modificada');
    return { cancelled: true };
  }
  async review(body: unknown, user: Actor) {
    const data = parse(reviewSchema, body);
    const booking = await this.db.booking.findFirst({
      where: {
        id: data.bookingId,
        businessId: user.businessId,
        customer: { userId: user.id },
        status: 'COMPLETED',
      },
    });
    if (!booking) throw new ForbiddenException('Solo puedes reseñar tus citas completadas');
    return this.db.review.create({
      data: { ...data, businessId: user.businessId, customerId: booking.customerId },
    });
  }
  async staffProfile(user: Actor) {
    const profile = await this.db.staff.findFirst({
      where: { businessId: user.businessId, userId: user.id },
      select: { id: true, name: true, locationId: true, version: true },
    });
    if (!profile) throw new NotFoundException('No tienes un perfil de personal');
    return profile;
  }
  async calendarToken(staffId: string, version: number, user: Actor) {
    parse(idSchema, staffId);
    if (user.role === 'STAFF' && user.staffId !== staffId) throw new NotFoundException();
    if (!['STAFF', 'ADMIN', 'OWNER', 'SUPERADMIN'].includes(user.role))
      throw new ForbiddenException();
    const token = randomBytes(32).toString('base64url');
    const result = await this.db.staff.updateMany({
      where: { id: staffId, businessId: user.businessId, version },
      data: { calendarTokenHash: hash(token), version: { increment: 1 } },
    });
    if (!result.count)
      throw new PreconditionFailedException('Profesional no encontrado o modificado');
    return { token, path: `/api/v1/calendar/${staffId}?token=${token}`, version: version + 1 };
  }
  async calendar(staffId: string, query: unknown) {
    parse(idSchema, staffId);
    const { token } = parse(z.object({ token: z.string().min(32).max(128) }).strict(), query);
    const staff = await this.db.staff.findFirst({
      where: {
        id: staffId,
        businessId: process.env.BUSINESS_ID,
        active: true,
        calendarTokenHash: hash(token),
      },
    });
    if (!staff) throw new NotFoundException();
    const items = await this.db.bookingItem.findMany({
      where: {
        businessId: staff.businessId,
        staffId,
        booking: {
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
        startAt: {
          gte: new Date(Date.now() - 86400000),
          lte: new Date(Date.now() + 90 * 86400000),
        },
      },
      include: { booking: { select: { code: true, updatedAt: true } } },
      orderBy: { startAt: 'asc' },
      take: 1000,
    });
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Agenda Abierta//ES',
      'CALSCALE:GREGORIAN',
      ...items.flatMap((b) => [
        'BEGIN:VEVENT',
        `UID:${b.id}@agenda-abierta`,
        `DTSTAMP:${icsDate(b.booking.updatedAt)}`,
        `DTSTART:${icsDate(b.startAt)}`,
        `DTEND:${icsDate(b.endAt)}`,
        `SUMMARY:${icsEscape(b.serviceName)}`,
        `DESCRIPTION:Reserva ${b.booking.code}`,
        'END:VEVENT',
      ]),
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }
}
