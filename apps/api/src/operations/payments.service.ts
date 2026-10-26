import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { Payment, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { Actor, AuditContext, audit } from './operations.service';
import { idSchema, pageSchema, parse, paymentSchema, refundSchema } from './validation';
import { enqueueBookingNotifications } from './notifications';

export interface PaymentProvider {
  readonly name: string;
  instructions(): Promise<{ manual: boolean; methods: string[] }>;
}
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';
  async instructions() {
    return { manual: true, methods: ['QR', 'TRANSFER', 'CASH'] };
  }
}
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const safePayment = ({ receiptPath, ...payment }: Payment) => ({
  ...payment,
  receiptAvailable: Boolean(receiptPath),
  netAmount: payment.amount.minus(payment.refundedAmount).toNumber(),
  remainingRefundable: ['CONFIRMED', 'RETAINED'].includes(payment.status)
    ? payment.amount.minus(payment.refundedAmount).toNumber()
    : 0,
});

@Injectable()
export class PaymentsService {
  private readonly storage = path.resolve(process.env.STORAGE_PATH ?? '../../storage', 'receipts');
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  private async authorizeBooking(bookingId: string, user?: Actor, token?: string) {
    parse(idSchema, bookingId);
    const businessId = user?.businessId ?? process.env.BUSINESS_ID;
    const booking = await this.db.booking.findFirst({
      where: { id: bookingId, businessId },
      include: { customer: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    const admin = user && ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(user.role);
    const owner = user && booking.customer.userId === user.id;
    const guest =
      token &&
      token.length <= 512 &&
      booking.manageTokenHash &&
      timingSafeEqual(Buffer.from(digest(token)), Buffer.from(booking.manageTokenHash));
    if (!admin && !owner && !guest) throw new NotFoundException('Reserva no encontrada');
    return booking;
  }

  async instructions() {
    const businessId = process.env.BUSINESS_ID;
    if (!businessId) throw new NotFoundException();
    const row = await this.db.setting.findUnique({
      where: { businessId_key: { businessId, key: 'payment.instructions' } },
    });
    return { ...(await new ManualPaymentProvider().instructions()), details: row?.value ?? null };
  }

  async create(body: unknown, key: unknown, user?: Actor, token?: string) {
    const data = parse(paymentSchema, body),
      idempotencyKey = parse(
        z
          .string()
          .min(8)
          .max(128)
          .regex(/^[\w.-]+$/),
        key,
      );
    const booking = await this.authorizeBooking(data.bookingId, user, token),
      businessId = booking.businessId;
    const requestHash = digest(JSON.stringify(data)),
      scope = `payment:${booking.id}`;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${booking.id} AND businessId = ${businessId} FOR UPDATE`;
      const previous = await tx.idempotencyRecord.findUnique({
        where: { businessId_scope_key: { businessId, scope, key: idempotencyKey } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash)
          throw new ConflictException('Idempotency-Key ya se usó con otros datos');
        return previous.response;
      }
      const fresh = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
      if (
        !['PENDING', 'CONFIRMED'].includes(fresh.status) ||
        (fresh.status === 'PENDING' && fresh.expiresAt && fresh.expiresAt <= new Date())
      )
        throw new ConflictException('La reserva no admite pagos');
      const paid = await tx.payment.aggregate({
        where: {
          businessId,
          bookingId: booking.id,
          status: { in: ['PENDING', 'SUBMITTED', 'CONFIRMED', 'RETAINED'] },
        },
        _sum: { amount: true, refundedAmount: true },
      });
      if (
        Number(paid._sum.amount ?? 0) - Number(paid._sum.refundedAmount ?? 0) + data.amount >
        Number(booking.totalAmount) + 0.001
      )
        throw new BadRequestException('El pago supera el saldo pendiente');
      const payment = await tx.payment.create({ data: { ...data, businessId } });
      const response = JSON.parse(JSON.stringify(safePayment(payment))) as Prisma.InputJsonValue;
      await tx.idempotencyRecord.create({
        data: {
          businessId,
          scope,
          key: idempotencyKey,
          requestHash,
          response,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          userId: user?.id,
          action: 'PAYMENT_CREATED',
          entityType: 'Payment',
          entityId: payment.id,
        },
      });
      return response;
    });
  }

  async list(query: unknown, user: Actor) {
    const { cursor, limit } = parse(pageSchema, query),
      admin = ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(user.role);
    if (user.role === 'STAFF') throw new ForbiddenException();
    const items = await this.db.payment.findMany({
      where: {
        businessId: user.businessId,
        ...(admin ? {} : { booking: { customer: { userId: user.id } } }),
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { items: items.map(safePayment), nextCursor: more ? items.at(-1)?.id : null };
  }

  async upload(
    id: string,
    version: number,
    file: { buffer: Buffer; size: number } | undefined,
    user?: Actor,
    token?: string,
  ) {
    parse(idSchema, id);
    if (!file || file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Sube una imagen JPG, PNG o WebP de hasta 5 MB');
    const payment = await this.db.payment.findFirst({
      where: { id, businessId: user?.businessId ?? process.env.BUSINESS_ID },
    });
    if (!payment) throw new NotFoundException();
    await this.authorizeBooking(payment.bookingId, user, token);
    if (!['PENDING', 'SUBMITTED'].includes(payment.status))
      throw new ConflictException('Este pago ya fue revisado');
    const b = file.buffer,
      jpeg = b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png =
      b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      b.length >= 12 &&
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP';
    if (!jpeg && !png && !webp) throw new BadRequestException('Formato de imagen no permitido');
    let optimized: Buffer;
    try {
      const processor = sharp(b, { limitInputPixels: 40_000_000, animated: false });
      const metadata = await processor.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
        throw new Error('Invalid image');
      optimized = await processor
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Imagen dañada o demasiado grande');
    }
    await mkdir(this.storage, { recursive: true, mode: 0o700 });
    const receiptPath = path.join(this.storage, `${randomUUID()}.webp`);
    await writeFile(receiptPath, optimized, { flag: 'wx', mode: 0o600 });
    try {
      const result = await this.db.payment.updateMany({
        where: {
          id,
          businessId: payment.businessId,
          version,
          status: { in: ['PENDING', 'SUBMITTED'] },
        },
        data: {
          receiptPath,
          receiptMime: 'image/webp',
          status: 'SUBMITTED',
          version: { increment: 1 },
        },
      });
      if (!result.count) throw new PreconditionFailedException('El pago fue modificado');
    } catch (error) {
      await unlink(receiptPath);
      throw error;
    }
    if (payment.receiptPath && path.dirname(payment.receiptPath) === this.storage)
      await unlink(payment.receiptPath).catch(() => undefined);
    return safePayment(await this.db.payment.findUniqueOrThrow({ where: { id } }));
  }

  async receipt(id: string, user?: Actor, token?: string) {
    const payment = await this.db.payment.findFirst({
      where: { id: parse(idSchema, id), businessId: user?.businessId ?? process.env.BUSINESS_ID },
    });
    if (!payment) throw new NotFoundException();
    await this.authorizeBooking(payment.bookingId, user, token);
    if (!payment.receiptPath || path.dirname(payment.receiptPath) !== this.storage)
      throw new NotFoundException('Comprobante no encontrado');
    return readFile(payment.receiptPath);
  }

  async refunds(id: string, query: unknown, user?: Actor, token?: string) {
    parse(idSchema, id);
    const { cursor, limit } = parse(pageSchema, query);
    const payment = await this.db.payment.findFirst({
      where: { id, businessId: user?.businessId ?? process.env.BUSINESS_ID },
    });
    if (!payment) throw new NotFoundException();
    await this.authorizeBooking(payment.bookingId, user, token);
    const items = await this.db.paymentRefund.findMany({
      where: {
        businessId: payment.businessId,
        paymentId: id,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true, amount: true, reason: true, createdAt: true },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { items, nextCursor: more ? items.at(-1)?.id : null };
  }

  async refund(
    id: string,
    version: number,
    body: unknown,
    key: unknown,
    user: Actor,
    context: AuditContext,
  ) {
    parse(idSchema, id);
    const data = parse(refundSchema, body);
    const idempotencyKey = parse(
      z
        .string()
        .min(8)
        .max(128)
        .regex(/^[\w.-]+$/),
      key,
    );
    const requestHash = digest(JSON.stringify(data)),
      businessId = user.businessId,
      scope = `refund:${id}`;
    return this.db.$transaction(
      async (tx) => {
        const initial = await tx.payment.findFirst({ where: { id, businessId } });
        if (!initial) throw new NotFoundException();
        await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${initial.bookingId} AND businessId = ${businessId} FOR UPDATE`;
        const payment = await tx.payment.findFirstOrThrow({ where: { id, businessId } });
        const cached = await tx.idempotencyRecord.findUnique({
          where: { businessId_scope_key: { businessId, scope, key: idempotencyKey } },
        });
        if (cached) {
          if (cached.requestHash !== requestHash)
            throw new ConflictException('Idempotency-Key ya se usó con otros datos');
          return cached.response;
        }
        const previous = await tx.paymentRefund.findUnique({
          where: {
            businessId_paymentId_idempotencyKey: { businessId, paymentId: id, idempotencyKey },
          },
        });
        if (previous) {
          if (previous.requestHash !== requestHash)
            throw new ConflictException('Idempotency-Key ya se usó con otros datos');
          return { ...safePayment(payment), refundId: previous.id };
        }
        if (payment.version !== version)
          throw new PreconditionFailedException('El pago fue modificado');
        if (!['CONFIRMED', 'RETAINED'].includes(payment.status))
          throw new ConflictException('El pago no tiene saldo confirmado para devolver');
        const amount = new Prisma.Decimal(data.amount),
          refundedAmount = payment.refundedAmount.plus(amount);
        if (refundedAmount.gt(payment.amount))
          throw new BadRequestException('El reembolso supera el saldo disponible');
        const refund = await tx.paymentRefund.create({
          data: {
            businessId,
            paymentId: id,
            amount,
            reason: data.reason,
            recordedById: user.id,
            idempotencyKey,
            requestHash,
          },
        });
        const updated = await tx.payment.update({
          where: { id },
          data: {
            refundedAmount,
            status: refundedAmount.equals(payment.amount) ? 'REFUNDED' : payment.status,
            version: { increment: 1 },
          },
        });
        // Financial adjustments preserve the booking price snapshot; its version marks a changed balance.
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { version: { increment: 1 } },
        });
        await audit(tx, user, 'PAYMENT_REFUND_RECORDED', 'Payment', id, context, {
          refundId: refund.id,
          amount: amount.toFixed(2),
          refundedAmount: refundedAmount.toFixed(2),
          reason: data.reason,
        });
        const response = JSON.parse(
          JSON.stringify({ ...safePayment(updated), refundId: refund.id }),
        ) as Prisma.InputJsonValue;
        await tx.idempotencyRecord.create({
          data: {
            businessId,
            scope,
            key: idempotencyKey,
            requestHash,
            response,
            statusCode: 200,
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        });
        return response;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async review(
    id: string,
    version: number,
    action: 'confirm' | 'reject' | 'retain',
    body: unknown,
    user: Actor,
    context: AuditContext,
  ) {
    parse(idSchema, id);
    const data = parse(
      z.object({ reason: z.string().min(5).max(500).optional() }).strict(),
      body ?? {},
    );
    return this.db.$transaction(async (tx) => {
      const initial = await tx.payment.findFirst({ where: { id, businessId: user.businessId } });
      if (!initial) throw new NotFoundException();
      await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${initial.bookingId} AND businessId = ${user.businessId} FOR UPDATE`;
      const payment = await tx.payment.findFirstOrThrow({
        where: { id, businessId: user.businessId },
      });
      if (payment.version !== version)
        throw new PreconditionFailedException('El pago fue modificado');
      const booking = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
      if (action === 'confirm' || action === 'reject') {
        if (!['PENDING', 'SUBMITTED'].includes(payment.status))
          throw new ConflictException('El pago ya fue revisado');
        if (
          action === 'confirm' &&
          (!['PENDING', 'CONFIRMED'].includes(booking.status) ||
            (booking.status === 'PENDING' && booking.expiresAt && booking.expiresAt <= new Date()))
        )
          throw new ConflictException(
            'La reserva ya no admite confirmación; revisa el reembolso manual',
          );
      } else if (payment.status !== 'CONFIRMED')
        throw new ConflictException('Solo se puede devolver o retener un pago confirmado');
      if (action === 'retain' && !['CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(booking.status))
        throw new ConflictException(
          'La retención corresponde a una cita cancelada, vencida o no asistida',
        );
      if (['reject', 'retain'].includes(action) && !data.reason)
        throw new BadRequestException('Especifica el motivo');
      const status = {
        confirm: 'CONFIRMED',
        reject: 'REJECTED',
        retain: 'RETAINED',
      } as const;
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: status[action],
          confirmedById: user.id,
          ...(action === 'confirm' ? { confirmedAt: new Date() } : {}),
          reason: data.reason,
          version: { increment: 1 },
        },
      });
      if (action === 'confirm' && booking.status === 'PENDING') {
        const paid = await tx.payment.aggregate({
          where: { bookingId: booking.id, businessId: user.businessId, status: 'CONFIRMED' },
          _sum: { amount: true, refundedAmount: true },
        });
        if (
          Number(paid._sum.amount ?? 0) - Number(paid._sum.refundedAmount ?? 0) >=
          Number(booking.depositAmount)
        ) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'CONFIRMED', expiresAt: null, version: { increment: 1 } },
          });
          await enqueueBookingNotifications(tx, booking.id, 'BOOKING_CONFIRMED');
        }
      }
      await audit(tx, user, `PAYMENT_${action.toUpperCase()}`, 'Payment', id, context, {
        reason: data.reason ?? null,
      });
      return safePayment(updated);
    });
  }
}
