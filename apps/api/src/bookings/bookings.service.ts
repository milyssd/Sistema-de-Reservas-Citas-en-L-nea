import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Prisma, type BookingStatus } from '@prisma/client';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { bookingCreateSchema, holdCreateSchema, idempotencyKeySchema } from '@reservas/shared';
import { PrismaService } from '../common/prisma.service';
import { type AuthUser } from '../common/auth.guard';
import {
  AvailabilityService,
  type Database,
  type BundlePart,
} from '../availability/availability.service';
import { canCancel } from '../availability/engine';
import { enqueueBookingNotifications, notifyWaitlist } from '../operations/notifications';

export type BookingInput = z.infer<typeof bookingCreateSchema>;
export type HoldInput = z.infer<typeof holdCreateSchema>;
export const bookingPatchSchema = z
  .object({
    startAt: z.string().datetime().optional(),
    staffId: z.string().uuid().optional(),
    staffIds: z.array(z.string().uuid().nullable()).min(1).max(8).optional(),
    status: z.enum(['CANCELLED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW']).optional(),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine(
    (input) => Boolean(input.startAt) !== Boolean(input.status),
    'Indica una nueva fecha o un estado.',
  )
  .refine(
    (input) => !(input.staffId || input.staffIds) || Boolean(input.startAt),
    'El profesional solo puede cambiar al reprogramar.',
  )
  .refine((input) => !(input.staffId && input.staffIds), 'Usa staffId o staffIds, no ambos.');
export type BookingPatch = z.infer<typeof bookingPatchSchema>;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const isManager = (actor?: AuthUser) =>
  actor && ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(actor.role);
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const bookingInclude = {
  items: {
    orderBy: { position: 'asc' as const },
    include: { staff: { select: { id: true, name: true } } },
  },
  location: true,
  staff: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, email: true, phone: true, userId: true } },
} satisfies Prisma.BookingInclude;
type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

@Injectable()
export class BookingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
  ) {}

  private publicBooking(booking: BookingRecord, includeContact = false, actor?: AuthUser) {
    const { manageTokenHash: _token, customer, ...rest } = booking;
    const { userId: _user, ...contact } = customer;
    if (actor?.role === 'STAFF') {
      const items = booking.items.filter((item) => item.staffId === actor.staffId);
      return {
        ...rest,
        canManage: booking.items.every((item) => item.staffId === actor.staffId),
        mixedStaff: new Set(booking.items.map((item) => item.staffId)).size > 1,
        items,
        staffId: actor.staffId!,
        staff: items[0]!.staff,
        startAt: items[0]!.startAt,
        endAt: items.at(-1)!.endAt,
        totalAmount: items.reduce((sum, item) => sum.add(item.price), new Prisma.Decimal(0)),
        depositAmount: items.reduce(
          (sum, item) => sum.add(item.depositAmount),
          new Prisma.Decimal(0),
        ),
        ...(includeContact ? { customer: contact } : {}),
      };
    }
    return {
      ...rest,
      canManage: true,
      mixedStaff: new Set(booking.items.map((item) => item.staffId)).size > 1,
      ...(includeContact ? { customer: contact } : {}),
    };
  }

  private manageToken(id: string) {
    const secret = process.env.BOOKING_LINK_SECRET ?? process.env.JWT_SECRET;
    if (!secret || secret.length < 32)
      throw new Error('BOOKING_LINK_SECRET/JWT_SECRET must contain 32 characters');
    return `${id}.${createHmac('sha256', secret).update(`booking-management:${id}`).digest('base64url')}`;
  }

  private validStart(start: string) {
    const date = new Date(start);
    if (
      !Number.isFinite(date.getTime()) ||
      date.getUTCSeconds() !== 0 ||
      date.getUTCMilliseconds() !== 0
    ) {
      throw new BadRequestException('La hora debe coincidir con un minuto exacto.');
    }
    return date;
  }

  private async lockStaff(db: Database, ids: string[]) {
    const businessId = this.availability.businessId();
    // Always lock in stable order. All writers use the same resource lock before checking occupancy.
    for (const id of [...new Set(ids)].sort()) {
      const rows = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM Staff WHERE id = ${id} AND businessId = ${businessId} FOR UPDATE`;
      if (!rows.length) throw new NotFoundException('Profesional no encontrado.');
    }
    // Expired pending bookings stop occupying slots immediately, independent of the cron cadence.
    await db.slotClaim.deleteMany({
      where: {
        businessId,
        staffId: { in: ids },
        booking: {
          OR: [
            { status: { in: ['CANCELLED', 'EXPIRED', 'NO_SHOW', 'COMPLETED'] } },
            { status: 'PENDING', expiresAt: { lte: new Date() } },
          ],
        },
      },
    });
  }

  private async transaction<T>(operation: (db: Database) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 10_000,
          timeout: 20_000,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        )
          continue;
        throw error;
      }
    }
    throw new ConflictException('La agenda cambió. Vuelve a consultar disponibilidad.');
  }

  private async chooseSlot(
    db: Database,
    input: HoldInput,
    options: {
      holdHash?: string;
      excludeBookingId?: string;
      online?: boolean;
      additionalStaffIds?: string[];
    } = {},
  ) {
    const startAt = this.validStart(input.startAt);
    const candidates = await this.availability.candidateResources(input, db);
    if (!candidates.length)
      throw new ConflictException({
        code: 'SLOT_UNAVAILABLE',
        message: 'No hay un profesional disponible para estos servicios.',
      });
    const lockedIds = [
      ...new Set([...candidates.map((staff) => staff.id), ...(options.additionalStaffIds ?? [])]),
    ];
    await this.lockStaff(db, lockedIds);
    const business = await this.availability.configuration(db);
    const result = await this.availability.plans(
      {
        ...input,
        from: startAt.toISOString(),
        to: new Date(startAt.getTime() + 60_000).toISOString(),
      },
      db,
      {
        excludeHoldHash: options.holdHash,
        excludeBookingId: options.excludeBookingId,
        online: options.online,
        allowedStaffIds: lockedIds,
      },
    );
    if (!input.staffId && !input.staffIds && business.assignmentRule === 'LEAST_BUSY') {
      const counts = await db.bookingItem.groupBy({
        by: ['staffId'],
        where: {
          businessId: business.id,
          staffId: { in: candidates.map((staff) => staff.id) },
          startAt: {
            gte: new Date(startAt.getTime() - 12 * 3_600_000),
            lt: new Date(startAt.getTime() + 12 * 3_600_000),
          },
          booking: { status: { in: ['PENDING', 'CONFIRMED'] } },
        },
        _count: { _all: true },
      });
      result.plans.sort(
        (a, b) =>
          (counts.find((row) => row.staffId === a.slot.staffId)?._count._all ?? 0) -
          (counts.find((row) => row.staffId === b.slot.staffId)?._count._all ?? 0),
      );
    }
    const plan = result.plans.find(({ slot }) => Date.parse(slot.startAt) === startAt.getTime());
    if (plan) return { ...plan, business };
    throw new ConflictException({
      code: 'SLOT_UNAVAILABLE',
      message: 'Ese turno ya no está disponible. Elige otro horario.',
    });
  }

  async hold(input: HoldInput) {
    const result = await this.transaction(async (db) => {
      const { slot, bundle, business } = await this.chooseSlot(db, input);
      const holdToken = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + business.holdMinutes * 60_000);
      const hold = await db.hold.create({
        data: {
          businessId: business.id,
          locationId: input.locationId,
          staffId: slot.staffId,
          serviceId: input.serviceIds[0]!,
          serviceIds: input.serviceIds,
          tokenHash: hash(holdToken),
          startAt: new Date(slot.startAt),
          endAt: new Date(slot.endAt),
          bufferBeforeMinutes: bundle.bufferBeforeMinutes,
          bufferAfterMinutes: bundle.bufferAfterMinutes,
          expiresAt,
        },
      });
      await db.holdItem.createMany({
        data: slot.segments.map((segment, position) => ({
          ...segment,
          businessId: business.id,
          holdId: hold.id,
          startAt: new Date(segment.startAt),
          endAt: new Date(segment.endAt),
          position,
        })),
      });
      return {
        id: hold.id,
        holdToken,
        expiresAt: expiresAt.toISOString(),
        staffId: slot.staffId,
        staffIds: slot.staffIds,
        segments: slot.segments,
        startAt: slot.startAt,
        endAt: slot.endAt,
      };
    });
    await this.availability.invalidate();
    return result;
  }

  private async contact(db: Database, input: BookingInput, actor?: AuthUser) {
    const businessId = this.availability.businessId();
    if (actor?.businessId && actor.businessId !== businessId)
      throw new ForbiddenException('Negocio incorrecto.');
    if (actor && actor.role === 'CLIENT') {
      const user = await db.user.findFirst({
        where: { id: actor.id, businessId, deletedAt: null },
      });
      if (!user) throw new NotFoundException('Cuenta no encontrada.');
      if (input.customer && input.customer.email !== user.email)
        throw new ForbiddenException('Solo puedes reservar para tu cuenta.');
      const customer = await db.customer.upsert({
        where: { businessId_email: { businessId, email: user.email } },
        create: {
          businessId,
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? input.customer?.phone ?? '',
        },
        update: {},
      });
      // An unverified account must never acquire a pre-existing guest's history by matching an email.
      if (customer.userId !== user.id)
        throw new ForbiddenException('Verifica tu correo antes de vincular reservas anteriores.');
      return customer;
    }
    if (!input.customer)
      throw new BadRequestException('Completa nombre, correo y celular del cliente.');
    return db.customer.upsert({
      where: { businessId_email: { businessId, email: input.customer.email } },
      create: { businessId, ...input.customer },
      update: {},
    });
  }

  private async claims(
    db: Database,
    bookingId: string,
    staffId: string,
    startAt: Date,
    endAt: Date,
    before: number,
    after: number,
    capacity: number,
  ) {
    const businessId = this.availability.businessId();
    const start = new Date(startAt.getTime() - before * 60_000);
    const end = new Date(endAt.getTime() + after * 60_000);
    const occupied = await db.slotClaim.findMany({
      where: { businessId, staffId, minute: { gte: start, lt: end } },
      select: { seat: true },
    });
    const seats = new Set(occupied.map((claim) => claim.seat));
    let seat = 0;
    while (seats.has(seat) && seat < capacity) seat++;
    if (seat >= capacity)
      throw new ConflictException({
        code: 'SLOT_UNAVAILABLE',
        message: 'El turno se acaba de ocupar.',
      });
    const data = [];
    for (let minute = start.getTime(); minute < end.getTime(); minute += 60_000) {
      data.push({ businessId, staffId, bookingId, minute: new Date(minute), seat });
    }
    await db.slotClaim.createMany({ data });
  }

  private async notify(
    db: Database,
    booking: BookingRecord,
    event: string,
    previous?: BookingRecord,
  ) {
    await enqueueBookingNotifications(db, booking.id, event.toUpperCase().replace('.', '_'));
    if (event === 'booking.cancelled' || event === 'booking.rescheduled')
      await notifyWaitlist(db, booking.id, previous);
  }

  async create(
    input: BookingInput,
    rawKey: string | undefined,
    actor?: AuthUser,
    ip?: string,
    beforeMutation?: () => Promise<void>,
  ) {
    const key = idempotencyKeySchema.safeParse(rawKey);
    if (!key.success)
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Envía una Idempotency-Key de 16 a 128 caracteres.',
      });
    if (!isManager(actor) && ['ADMIN', 'WALK_IN'].includes(input.source))
      throw new ForbiddenException('Origen de reserva no permitido.');
    if (
      actor?.role === 'STAFF' &&
      (input.staffIds
        ? input.staffIds.some((staff) => staff !== actor.staffId)
        : input.staffId !== actor.staffId)
    )
      throw new ForbiddenException('Solo puedes reservar en tu agenda.');
    const businessId = this.availability.businessId();
    const scope = `booking:${actor?.id ?? hash(input.customer?.email ?? '').slice(0, 32)}`;
    const requestHash = hash(JSON.stringify(input));
    const lookup = { businessId_scope_key: { businessId, scope, key: key.data } };
    const replay = async () => {
      const record = await this.prisma.idempotencyRecord.findUnique({ where: lookup });
      if (!record) return null;
      if (record.requestHash !== requestHash)
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Esta clave ya se usó con otros datos.',
        });
      const response = record.response as Record<string, unknown>;
      return { ...response, manageToken: this.manageToken(String(response.id)) };
    };
    const existing = await replay();
    if (existing) return existing;
    await beforeMutation?.();
    try {
      const result = await this.transaction(async (db) => {
        await db.idempotencyRecord.create({
          data: {
            businessId,
            scope,
            key: key.data,
            requestHash,
            response: {},
            expiresAt: new Date(Date.now() + 7 * 86_400_000),
          },
        });
        const holdHash = input.holdToken ? hash(input.holdToken) : undefined;
        if (input.holdId && !input.holdToken)
          throw new BadRequestException('Se requiere el token del turno retenido.');
        let selectedStaff = input.staffId;
        let selectedStaffIds = input.staffIds;
        if (holdHash) {
          const hold = await db.hold.findFirst({
            where: {
              businessId,
              tokenHash: holdHash,
              expiresAt: { gt: new Date() },
              consumedAt: null,
            },
            include: { items: { orderBy: { position: 'asc' } } },
          });
          if (
            !hold ||
            (input.holdId && input.holdId !== hold.id) ||
            hold.locationId !== input.locationId ||
            hold.startAt.getTime() !== Date.parse(input.startAt) ||
            (selectedStaff &&
              (hold.items.length
                ? hold.items.some((item) => item.staffId !== selectedStaff)
                : hold.staffId !== selectedStaff)) ||
            (selectedStaffIds &&
              selectedStaffIds.some(
                (staff, index) => staff !== null && staff !== hold.items[index]?.staffId,
              )) ||
            JSON.stringify(hold.serviceIds ?? [hold.serviceId]) !== JSON.stringify(input.serviceIds)
          ) {
            throw new ConflictException({
              code: 'HOLD_EXPIRED',
              message: 'La retención venció o no corresponde a este turno.',
            });
          }
          if (
            hold.items.length &&
            (selectedStaffIds || new Set(hold.items.map((item) => item.staffId)).size > 1)
          ) {
            selectedStaffIds = hold.items.map((item) => item.staffId);
            selectedStaff = undefined;
          } else selectedStaff = hold.staffId;
        }
        const { slot, bundle, business } = await this.chooseSlot(
          db,
          { ...input, staffId: selectedStaff, staffIds: selectedStaffIds },
          { holdHash, online: !isManager(actor) },
        );
        const customer = await this.contact(db, input, actor);
        await db.$queryRaw`SELECT id FROM Customer WHERE id = ${customer.id} AND businessId = ${businessId} FOR UPDATE`;
        const latestCustomer = await db.customer.findUniqueOrThrow({ where: { id: customer.id } });
        if (latestCustomer.blocked || latestCustomer.noShowCount >= business.maxNoShows)
          throw new ForbiddenException('Contacta con el negocio para reservar.');
        const pending = await db.booking.count({
          where: {
            businessId,
            customerId: customer.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startAt: { gt: new Date() },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });
        if (pending >= business.maxPendingBookings)
          throw new ConflictException({
            code: 'BOOKING_LIMIT',
            message: 'Alcanzaste el límite de reservas próximas.',
          });
        const startAt = new Date(slot.startAt);
        const endAt = new Date(slot.endAt);
        const total = bundle.parts.reduce(
          (sum, item) => sum.add(item.effectivePrice),
          new Prisma.Decimal(0),
        );
        const deposit = bundle.parts.reduce(
          (sum, item) => sum.add(item.effectiveDeposit),
          new Prisma.Decimal(0),
        );
        const pendingPayment = deposit.greaterThan(0);
        const status = !pendingPayment && business.autoConfirm ? 'CONFIRMED' : 'PENDING';
        const code = [...randomBytes(8)]
          .map((value) => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[value % 31])
          .join('');
        const created = await db.booking.create({
          data: {
            code,
            businessId,
            locationId: input.locationId,
            staffId: slot.staffId,
            customerId: customer.id,
            startAt,
            endAt,
            source: input.source,
            status,
            totalAmount: total,
            depositAmount: deposit,
            notes: input.notes,
            expiresAt:
              status === 'PENDING'
                ? new Date(
                    Math.min(
                      Date.now() + business.paymentExpiryHours * 3_600_000,
                      startAt.getTime(),
                    ),
                  )
                : null,
          },
        });
        await db.bookingItem.createMany({
          data: bundle.parts.map((part, index) => ({
            ...this.itemSnapshot(part, businessId, part.staffId!, startAt, index),
            bookingId: created.id,
          })),
        });
        const booking = await db.booking.findUniqueOrThrow({
          where: { id: created.id },
          include: bookingInclude,
        });
        const manageToken = this.manageToken(booking.id);
        await db.booking.update({
          where: { id: booking.id },
          data: { manageTokenHash: hash(manageToken) },
        });
        for (const part of bundle.parts) {
          const segmentStart = new Date(startAt.getTime() + part.offsetMinutes * 60_000);
          await this.claims(
            db,
            booking.id,
            part.staffId!,
            segmentStart,
            new Date(segmentStart.getTime() + part.effectiveDuration * 60_000),
            part.bufferBeforeMinutes,
            part.bufferAfterMinutes,
            part.capacity,
          );
        }
        if (holdHash) {
          const consumed = await db.hold.updateMany({
            where: {
              businessId,
              tokenHash: holdHash,
              consumedAt: null,
              expiresAt: { gt: new Date() },
            },
            data: { consumedAt: new Date() },
          });
          if (consumed.count !== 1)
            throw new ConflictException({
              code: 'HOLD_EXPIRED',
              message: 'La retención venció o ya se utilizó.',
            });
        }
        await db.auditLog.create({
          data: {
            businessId,
            userId: actor?.id,
            action: 'BOOKING_CREATED',
            entityType: 'Booking',
            entityId: booking.id,
            ip,
          },
        });
        await this.notify(db, booking, 'booking.created');
        const response = this.publicBooking(booking, Boolean(actor), actor);
        await db.idempotencyRecord.update({ where: lookup, data: { response: json(response) } });
        return { ...response, manageToken };
      });
      await this.availability.invalidate();
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const previous = await replay();
        if (previous) return previous;
        throw new ConflictException({
          code: 'SLOT_UNAVAILABLE',
          message: 'El turno ya fue reservado. Actualiza los horarios.',
        });
      }
      throw error;
    }
  }

  private itemSnapshot(
    part: BundlePart,
    businessId: string,
    staffId: string,
    start: Date,
    position: number,
  ) {
    const startAt = new Date(start.getTime() + part.offsetMinutes * 60_000);
    return {
      businessId,
      staffId,
      serviceId: part.id,
      serviceName: part.name,
      durationMinutes: part.effectiveDuration,
      bufferBeforeMinutes: part.bufferBeforeMinutes,
      bufferAfterMinutes: part.bufferAfterMinutes,
      price: part.effectivePrice,
      depositAmount: part.effectiveDeposit,
      capacity: part.capacity,
      startAt,
      endAt: new Date(startAt.getTime() + part.effectiveDuration * 60_000),
      position,
    };
  }

  private scope(actor: AuthUser): Prisma.BookingWhereInput {
    const businessId = this.availability.businessId();
    if (actor.businessId !== businessId) throw new ForbiddenException('Negocio incorrecto.');
    if (isManager(actor)) return { businessId };
    if (actor.role === 'STAFF' && actor.staffId)
      return { businessId, items: { some: { businessId, staffId: actor.staffId } } };
    return { businessId, customer: { userId: actor.id, businessId } };
  }

  async list(
    actor: AuthUser,
    input: {
      cursor?: string;
      limit: number;
      from?: string;
      to?: string;
      staffId?: string;
      locationId?: string;
      status?: BookingStatus;
      order: 'asc' | 'desc';
    },
  ) {
    const scope = this.scope(actor);
    if (actor.role === 'STAFF' && input.staffId && input.staffId !== actor.staffId)
      throw new ForbiddenException('Solo puedes consultar tu agenda.');
    if (
      input.cursor &&
      !(await this.prisma.booking.findFirst({
        where: { ...scope, id: input.cursor },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Cursor no encontrado.');
    const rows = await this.prisma.booking.findMany({
      where: {
        ...scope,
        ...(input.staffId ? { items: { some: { staffId: input.staffId } } } : {}),
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.from || input.to
          ? actor.role === 'STAFF'
            ? {
                items: {
                  some: {
                    staffId: actor.staffId,
                    startAt: {
                      ...(input.from ? { gte: new Date(input.from) } : {}),
                      ...(input.to ? { lt: new Date(input.to) } : {}),
                    },
                  },
                },
              }
            : {
                startAt: {
                  ...(input.from ? { gte: new Date(input.from) } : {}),
                  ...(input.to ? { lt: new Date(input.to) } : {}),
                },
              }
          : {}),
      },
      include: bookingInclude,
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ startAt: input.order }, { id: input.order }],
    });
    const hasMore = rows.length > input.limit;
    const data = rows
      .slice(0, input.limit)
      .map((booking) => this.publicBooking(booking, true, actor));
    return { data, nextCursor: hasMore ? data.at(-1)!.id : null };
  }

  async get(
    id: string,
    actor?: AuthUser,
    token?: string,
    db: Database = this.prisma,
  ): Promise<BookingRecord> {
    const where = actor
      ? this.scope(actor)
      : { businessId: this.availability.businessId(), manageTokenHash: hash(token ?? '') };
    const booking = await db.booking.findFirst({
      where: { ...where, id },
      include: bookingInclude,
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada.');
    return booking;
  }

  async read(id: string, actor?: AuthUser, token?: string) {
    return this.publicBooking(await this.get(id, actor, token), Boolean(actor), actor);
  }

  tokenId(token: string) {
    if (!/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(token))
      throw new NotFoundException('Reserva no encontrada.');
    return token.slice(0, 36);
  }

  async patch(
    id: string,
    input: BookingPatch,
    ifMatch: string | undefined,
    actor?: AuthUser,
    token?: string,
    ip?: string,
  ) {
    if (!ifMatch)
      throw new HttpException(
        { code: 'PRECONDITION_REQUIRED', message: 'Envía la versión actual en If-Match.' },
        428,
      );
    const parsedVersion = /^"?(\d+)"?$/.exec(ifMatch);
    if (!parsedVersion) throw new BadRequestException('If-Match inválido.');
    const version = Number(parsedVersion[1]);
    const result = await this.transaction(async (db) => {
      const current = await this.get(id, actor, token, db);
      if (current.version !== version)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: 'La reserva cambió. Actualiza la página.',
        });
      if (
        actor?.role === 'STAFF' &&
        (current.items.some((item) => item.staffId !== actor.staffId) ||
          (input.staffIds && input.staffIds.some((staff) => staff !== actor.staffId)) ||
          (input.staffId && input.staffId !== actor.staffId))
      ) {
        throw new ForbiddenException(
          'Una cita con otras agendas debe ser modificada por el cliente o la administración.',
        );
      }
      const staffIds =
        input.staffIds ??
        (!input.staffId && new Set(current.items.map((item) => item.staffId)).size > 1
          ? current.items.map((item) => item.staffId)
          : undefined);
      const selection = input.startAt
        ? await this.chooseSlot(
            db,
            {
              locationId: current.locationId,
              serviceIds: current.items.map((item) => item.serviceId),
              staffId: staffIds ? undefined : (input.staffId ?? current.staffId),
              staffIds,
              startAt: input.startAt,
            },
            {
              excludeBookingId: current.id,
              online: !(isManager(actor) || actor?.role === 'STAFF'),
              additionalStaffIds: current.items.map((item) => item.staffId),
            },
          )
        : null;
      if (!selection)
        await this.lockStaff(
          db,
          current.items.map((item) => item.staffId),
        );
      const booking = await this.get(id, actor, token, db);
      if (
        booking.version !== version ||
        current.version !== booking.version ||
        current.staffId !== booking.staffId
      )
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: 'La reserva cambió. Actualiza la página.',
        });
      if (
        !['PENDING', 'CONFIRMED'].includes(booking.status) ||
        (booking.expiresAt && booking.expiresAt <= new Date())
      )
        throw new ConflictException('La reserva ya terminó o venció.');
      const business = await this.availability.configuration(db);
      const privileged = isManager(actor) || actor?.role === 'STAFF';
      if (!privileged && !canCancel(booking.startAt, new Date(), business.cancellationHours)) {
        throw new ForbiddenException({
          code: 'CANCELLATION_WINDOW_CLOSED',
          message: `Los cambios requieren ${business.cancellationHours} horas de anticipación.`,
        });
      }
      let data: Prisma.BookingUpdateInput = { version: { increment: 1 } };
      if (input.startAt && selection) {
        // Preserve the sold prices/durations. Repricing would silently change the customer's agreement.
        if (
          selection.bundle.parts.some(
            (part, index) =>
              part.effectiveDuration !== booking.items[index]?.durationMinutes ||
              part.bufferBeforeMinutes !== booking.items[index]?.bufferBeforeMinutes ||
              part.bufferAfterMinutes !== booking.items[index]?.bufferAfterMinutes,
          )
        ) {
          throw new ConflictException({
            code: 'SERVICE_CHANGED',
            message: 'La duración del servicio cambió. Contacta al negocio para ajustar esta cita.',
          });
        }
        const startAt = new Date(selection.slot.startAt);
        const shift = startAt.getTime() - booking.startAt.getTime();
        await db.slotClaim.deleteMany({
          where: { businessId: business.id, bookingId: booking.id },
        });
        for (const [index, item] of booking.items.entries()) {
          const part = selection.bundle.parts[index]!;
          const segmentStart = new Date(item.startAt.getTime() + shift);
          const segmentEnd = new Date(item.endAt.getTime() + shift);
          await this.claims(
            db,
            booking.id,
            part.staffId!,
            segmentStart,
            segmentEnd,
            item.bufferBeforeMinutes,
            item.bufferAfterMinutes,
            part.capacity,
          );
          await db.bookingItem.update({
            where: { id: item.id },
            data: { startAt: segmentStart, endAt: segmentEnd, staffId: part.staffId! },
          });
        }
        data = {
          ...data,
          startAt,
          endAt: new Date(selection.slot.endAt),
          staff: { connect: { id: selection.slot.staffId } },
          ...(booking.expiresAt
            ? { expiresAt: new Date(Math.min(booking.expiresAt.getTime(), startAt.getTime())) }
            : {}),
        };
        await db.reminder.deleteMany({
          where: { businessId: business.id, bookingId: booking.id, sentAt: null },
        });
      } else if (input.status) {
        if (!privileged && input.status !== 'CANCELLED')
          throw new ForbiddenException('No puedes cambiar a ese estado.');
        if (input.status === 'CONFIRMED' && booking.status !== 'PENDING')
          throw new ConflictException('La reserva ya está confirmada.');
        if (
          ['COMPLETED', 'NO_SHOW'].includes(input.status) &&
          (booking.status !== 'CONFIRMED' || booking.startAt > new Date())
        ) {
          throw new ConflictException('Solo puedes cerrar una cita confirmada que ya comenzó.');
        }
        if (input.status === 'CONFIRMED') {
          const paid = await db.payment.aggregate({
            where: { businessId: business.id, bookingId: booking.id, status: 'CONFIRMED' },
            _sum: { amount: true, refundedAmount: true },
          });
          const netPaid = (paid._sum.amount ?? new Prisma.Decimal(0)).sub(
            paid._sum.refundedAmount ?? 0,
          );
          if (booking.depositAmount.greaterThan(netPaid))
            throw new ConflictException('Confirma primero el anticipo.');
        }
        data = {
          ...data,
          status: input.status,
          ...(input.status === 'CONFIRMED' ? { expiresAt: null } : {}),
          ...(input.status === 'CANCELLED'
            ? {
                cancelledAt: new Date(),
                cancellationReason: input.reason ?? 'Cancelada por el cliente',
              }
            : {}),
        };
        if (input.status !== 'CONFIRMED') {
          await db.slotClaim.deleteMany({
            where: { businessId: business.id, bookingId: booking.id },
          });
          await db.reminder.deleteMany({
            where: { businessId: business.id, bookingId: booking.id, sentAt: null },
          });
        }
        if (input.status === 'NO_SHOW')
          await db.customer.update({
            where: { id: booking.customerId },
            data: { noShowCount: { increment: 1 }, version: { increment: 1 } },
          });
      }
      const updated = await db.booking.update({ where: { id }, data, include: bookingInclude });
      await db.auditLog.create({
        data: {
          businessId: business.id,
          userId: actor?.id,
          action: input.startAt ? 'BOOKING_RESCHEDULED' : `BOOKING_${input.status}`,
          entityType: 'Booking',
          entityId: id,
          ip,
          metadata: { previousVersion: version, reason: input.reason ?? null },
        },
      });
      await this.notify(
        db,
        updated,
        input.startAt ? 'booking.rescheduled' : `booking.${input.status?.toLowerCase()}`,
        booking,
      );
      return this.publicBooking(updated, Boolean(actor), actor);
    });
    await this.availability.invalidate();
    return result;
  }

  async calendar(id: string, actor?: AuthUser, token?: string) {
    const booking = await this.get(id, actor, token);
    const escape = (text: string) =>
      text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, '\\$&');
    const date = (value: Date) =>
      value
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
    const items =
      actor?.role === 'STAFF'
        ? booking.items.filter((item) => item.staffId === actor.staffId)
        : booking.items;
    const events = items.flatMap((item) => [
      'BEGIN:VEVENT',
      `UID:${booking.id}-${item.id}@agenda-abierta`,
      `DTSTAMP:${date(new Date())}`,
      `DTSTART:${date(item.startAt)}`,
      `DTEND:${date(item.endAt)}`,
      `SUMMARY:${escape(item.serviceName + ' · ' + item.staff.name)}`,
      `LOCATION:${escape(booking.location.name + ', ' + booking.location.address)}`,
      `DESCRIPTION:Código ${booking.code}`,
      `STATUS:${booking.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    ]);
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Agenda Abierta//Reservas Bolivia//ES',
      'CALSCALE:GREGORIAN',
      ...events,
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }
}
