import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { httpUrlSchema } from '@reservas/shared';
import { reportOccupancy } from './report-time';
import { PrismaService } from '../common/prisma.service';
import {
  businessSchema,
  idSchema,
  pageSchema,
  parse,
  reportSchema,
  resourceSchemas,
  Resource,
} from './validation';

export type Actor = {
  id: string;
  businessId: string;
  role: string;
  customerId?: string;
  staffId?: string;
};
export type AuditContext = { ip?: string; requestId?: string };
type Db = Prisma.TransactionClient;
// The registry is a closed whitelist. Client input never becomes a SQL identifier.
const models = {
  services: 'service',
  categories: 'serviceCategory',
  locations: 'location',
  staff: 'staff',
  'staff-services': 'staffService',
  'working-hours': 'workingHours',
  'time-off': 'timeOff',
  customers: 'customer',
  settings: 'setting',
} as const;
type Delegate = {
  findMany(args: object): Promise<Record<string, unknown>[]>;
  findFirst(args: object): Promise<Record<string, unknown> | null>;
  create(args: object): Promise<Record<string, unknown>>;
  updateMany(args: object): Promise<{ count: number }>;
  deleteMany(args: object): Promise<{ count: number }>;
};
function delegate(db: Db, resource: Resource): Delegate {
  return db[models[resource]] as unknown as Delegate;
}
function safeRow(resource: Resource, row: Record<string, unknown>): Record<string, unknown> {
  if (resource !== 'staff') return row;
  const { calendarTokenHash: _calendarTokenHash, ...safe } = row;
  return safe;
}
function resourceName(value: string): Resource {
  if (!Object.hasOwn(models, value)) throw new NotFoundException('Recurso inexistente');
  return value as Resource;
}
export async function audit(
  db: Db,
  user: Actor,
  action: string,
  entityType: string,
  entityId?: string,
  context: AuditContext = {},
  metadata?: Prisma.InputJsonValue,
) {
  await db.auditLog.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      action,
      entityType,
      entityId,
      ip: context.ip?.slice(0, 45),
      requestId: context.requestId?.slice(0, 64),
      metadata,
    },
  });
}
function jsonData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      ['startAt', 'endAt'].includes(key) && typeof value === 'string' ? new Date(value) : value,
    ]),
  );
}

@Injectable()
export class OperationsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async catalog() {
    const businessId = process.env.BUSINESS_ID;
    if (!businessId) throw new NotFoundException('Negocio no configurado');
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        currency: true,
        locale: true,
        timezone: true,
        logoUrl: true,
        brandColor: true,
        minimumNoticeMinutes: true,
        maximumAdvanceDays: true,
        slotIntervalMinutes: true,
        cancellationHours: true,
        maintenanceMode: true,
        featureFlags: true,
      },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    const [locations, services, staff, categories, reviews] = await Promise.all([
      this.db.location.findMany({
        where: { businessId, active: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.db.service.findMany({
        where: { businessId, active: true, onlineBookable: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        take: 100,
      }),
      this.db.staff.findMany({
        where: { businessId, active: true },
        select: {
          id: true,
          locationId: true,
          name: true,
          bio: true,
          photoUrl: true,
          isResource: true,
          staffServices: { select: { serviceId: true, durationMinutes: true, price: true } },
          workingHours: { select: { dayOfWeek: true, startMinute: true, endMinute: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        take: 100,
      }),
      this.db.serviceCategory.findMany({
        where: { businessId, active: true },
        orderBy: { sortOrder: 'asc' },
        take: 100,
      }),
      this.db.review.findMany({
        where: { businessId, visible: true },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);
    return {
      business: {
        ...business,
        featureFlags: {
          multiStaffBookings:
            (business.featureFlags as { multiStaffBookings?: boolean } | null)
              ?.multiStaffBookings === true,
        },
      },
      locations,
      services,
      staff,
      categories,
      reviews: reviews.map((r) => ({ ...r, customer: { name: r.customer.name.split(' ')[0] } })),
    };
  }

  async list(resource: string, query: unknown, user: Actor) {
    const name = resourceName(resource),
      { cursor, limit } = parse(pageSchema, query);
    const items = await delegate(this.db, name).findMany({
      where: { businessId: user.businessId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    const safe =
      name === 'staff'
        ? items.map(({ calendarTokenHash: _calendarTokenHash, ...row }) => row)
        : items;
    return { items: safe, nextCursor: more ? items.at(-1)?.id : null };
  }

  async get(resource: string, id: string, user: Actor) {
    const item = await delegate(this.db, resourceName(resource)).findFirst({
      where: { id: parse(idSchema, id), businessId: user.businessId },
    });
    if (!item) throw new NotFoundException('Registro no encontrado');
    if (resource === 'staff') delete item.calendarTokenHash;
    return item;
  }

  private async lockResources(
    db: Db,
    resource: Resource,
    businessId: string,
    data: Record<string, unknown>,
    checkOverlap = true,
  ) {
    let ids: string[] = [];
    if (typeof data.staffId === 'string') ids = [data.staffId];
    else if (resource === 'staff' && typeof data.id === 'string') ids = [data.id];
    else if (resource === 'time-off' && typeof data.locationId === 'string')
      ids = (
        await db.staff.findMany({
          where: { businessId, locationId: data.locationId },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((row) => row.id);
    else if (resource === 'services' && typeof data.id === 'string')
      ids = (
        await db.staffService.findMany({
          where: { businessId, serviceId: data.id },
          select: { staffId: true },
        })
      ).map((row) => row.staffId);
    ids = [...new Set(ids)].sort();
    if (ids.length)
      await db.$queryRaw(
        Prisma.sql`SELECT id FROM Staff WHERE businessId = ${businessId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`,
      );
    if (checkOverlap && resource === 'time-off' && data.startAt && data.endAt && ids.length) {
      const start = new Date(String(data.startAt)).getTime(),
        end = new Date(String(data.endAt)).getTime(),
        now = new Date();
      const span = {
        startAt: { lt: new Date(end + 240 * 60000) },
        endAt: { gt: new Date(start - 240 * 60000) },
      };
      const [items, holds, holdItems] = await Promise.all([
        db.bookingItem.findMany({
          where: {
            businessId,
            staffId: { in: ids },
            ...span,
            booking: {
              OR: [
                { status: 'CONFIRMED' },
                { status: 'PENDING', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              ],
            },
          },
          select: {
            startAt: true,
            endAt: true,
            bufferBeforeMinutes: true,
            bufferAfterMinutes: true,
          },
        }),
        db.hold.findMany({
          where: {
            businessId,
            staffId: { in: ids },
            ...span,
            expiresAt: { gt: now },
            consumedAt: null,
            items: { none: {} },
          },
          select: {
            startAt: true,
            endAt: true,
            bufferBeforeMinutes: true,
            bufferAfterMinutes: true,
          },
        }),
        db.holdItem.findMany({
          where: {
            businessId,
            staffId: { in: ids },
            ...span,
            hold: { expiresAt: { gt: now }, consumedAt: null },
          },
          select: {
            startAt: true,
            endAt: true,
            bufferBeforeMinutes: true,
            bufferAfterMinutes: true,
          },
        }),
      ]);
      if (
        [...items, ...holds, ...holdItems].some(
          (item) =>
            item.startAt.getTime() - item.bufferBeforeMinutes * 60000 < end &&
            item.endAt.getTime() + item.bufferAfterMinutes * 60000 > start,
        )
      )
        throw new ConflictException(
          'El bloqueo coincide con una reserva o retención activa; reprograma primero la cita',
        );
    }
  }

  private async validateRelations(db: Db, businessId: string, data: Record<string, unknown>) {
    const related = [
      ['locationId', 'location'],
      ['categoryId', 'serviceCategory'],
      ['staffId', 'staff'],
      ['serviceId', 'service'],
      ['userId', 'user'],
    ] as const;
    for (const [field, model] of related) {
      if (typeof data[field] !== 'string') continue;
      const entity = await (db[model] as unknown as Delegate).findFirst({
        where: { businessId, id: data[field] },
      });
      if (!entity) throw new BadRequestException(`Referencia inválida: ${field}`);
      if (field === 'userId' && !['STAFF', 'ADMIN', 'OWNER'].includes(String(entity.role)))
        throw new BadRequestException('El usuario debe tener un rol de personal');
    }
    if (typeof data.staffId === 'string' && typeof data.locationId === 'string') {
      const staff = await db.staff.findFirst({ where: { id: data.staffId, businessId } });
      if (staff?.locationId !== data.locationId)
        throw new BadRequestException('El profesional pertenece a otra sede');
    }
    if (
      data.startAt &&
      data.endAt &&
      new Date(String(data.endAt)) <= new Date(String(data.startAt))
    )
      throw new BadRequestException('El fin debe ser posterior al inicio');
    if (
      typeof data.startMinute === 'number' &&
      typeof data.endMinute === 'number' &&
      data.endMinute - data.startMinute > 1440
    )
      throw new BadRequestException(
        'Tramo de horario inválido; use minutos del día siguiente al cruzar medianoche',
      );
    if (typeof data.depositAmount === 'number' && Number(data.depositAmount) > Number(data.price))
      throw new BadRequestException('El anticipo supera el precio');
    if (data.key === 'payment.instructions' && data.value && typeof data.value === 'object') {
      const qrUrl = (data.value as Record<string, unknown>).qrUrl;
      if (qrUrl !== undefined && qrUrl !== '') parse(httpUrlSchema, qrUrl);
    }
    if (data.key && JSON.stringify(data.value).length > 16000)
      throw new BadRequestException('Configuración demasiado extensa');
  }

  async create(resource: string, body: unknown, user: Actor, context: AuditContext) {
    const name = resourceName(resource),
      data = jsonData(parse(resourceSchemas[name], body));
    return this.db.$transaction(
      async (tx) => {
        await this.lockResources(tx, name, user.businessId, data);
        await this.validateRelations(tx, user.businessId, data);
        const row = await delegate(tx, name).create({
          data: { ...data, businessId: user.businessId },
        });
        await audit(tx, user, 'CREATE', name, String(row.id), context);
        return safeRow(name, row);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async update(
    resource: string,
    id: string,
    version: number,
    body: unknown,
    user: Actor,
    context: AuditContext,
  ) {
    const name = resourceName(resource);
    const parsed = parse(resourceSchemas[name].partial(), body);
    // Zod 4 applies defaults inside optional properties; PATCH must change only supplied keys.
    const provided = new Set(Object.keys(body as Record<string, unknown>));
    const data = jsonData(
      Object.fromEntries(Object.entries(parsed).filter(([key]) => provided.has(key))),
    );
    parse(idSchema, id);
    if (!Object.keys(data).length) throw new BadRequestException('No hay cambios');
    return this.db.$transaction(
      async (tx) => {
        const model = delegate(tx, name),
          existing = await model.findFirst({ where: { id, businessId: user.businessId } });
        if (!existing) throw new NotFoundException('Registro no encontrado');
        await this.lockResources(tx, name, user.businessId, { ...existing, ...data });
        await this.validateRelations(tx, user.businessId, { ...existing, ...data });
        const result = await model.updateMany({
          where: { id, businessId: user.businessId, version },
          data: { ...data, version: { increment: 1 } },
        });
        if (!result.count)
          throw new PreconditionFailedException('El registro fue modificado; vuelve a cargarlo');
        await audit(tx, user, 'UPDATE', name, id, context, { fields: Object.keys(data) });
        const updated = await model.findFirst({ where: { id, businessId: user.businessId } });
        return updated ? safeRow(name, updated) : updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async remove(resource: string, id: string, version: number, user: Actor, context: AuditContext) {
    const name = resourceName(resource);
    parse(idSchema, id);
    if (name === 'customers')
      throw new BadRequestException(
        'Usa el proceso de eliminación de cuenta para proteger el historial',
      );
    return this.db.$transaction(
      async (tx) => {
        const model = delegate(tx, name);
        const existing = await model.findFirst({ where: { id, businessId: user.businessId } });
        if (!existing) throw new NotFoundException('Registro no encontrado');
        await this.lockResources(tx, name, user.businessId, existing, false);
        const result =
          'active' in existing
            ? await model.updateMany({
                where: { id, businessId: user.businessId, version },
                data: { active: false, version: { increment: 1 } },
              })
            : await model.deleteMany({ where: { id, businessId: user.businessId, version } });
        if (!result.count) throw new PreconditionFailedException('El registro fue modificado');
        await audit(tx, user, 'DELETE', name, id, context);
        return { deleted: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async business(user: Actor) {
    return this.db.business.findUniqueOrThrow({ where: { id: user.businessId } });
  }
  async updateBusiness(body: unknown, version: number, user: Actor, context: AuditContext) {
    const data = parse(businessSchema, body);
    return this.db.$transaction(async (tx) => {
      if (data.featureFlags) {
        const existing = await tx.business.findUniqueOrThrow({ where: { id: user.businessId } });
        data.featureFlags = {
          ...(existing.featureFlags &&
          typeof existing.featureFlags === 'object' &&
          !Array.isArray(existing.featureFlags)
            ? existing.featureFlags
            : {}),
          ...data.featureFlags,
        };
      }
      const result = await tx.business.updateMany({
        where: { id: user.businessId, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!result.count) throw new PreconditionFailedException('La configuración fue modificada');
      await audit(tx, user, 'UPDATE_POLICY', 'business', user.businessId, context, {
        fields: Object.keys(data),
      });
      return tx.business.findUniqueOrThrow({ where: { id: user.businessId } });
    });
  }

  async customerHistory(id: string, query: unknown, user: Actor) {
    parse(idSchema, id);
    const { cursor, limit } = parse(pageSchema, query);
    const customer = await this.db.customer.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    const items = await this.db.booking.findMany({
      where: {
        businessId: user.businessId,
        customerId: id,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        code: true,
        startAt: true,
        endAt: true,
        status: true,
        totalAmount: true,
        items: true,
      },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { customer, items, nextCursor: more ? items.at(-1)?.id : null };
  }

  async audits(query: unknown, user: Actor) {
    const { cursor, limit } = parse(pageSchema, query);
    const items = await this.db.auditLog.findMany({
      where: { businessId: user.businessId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { items, nextCursor: more ? items.at(-1)?.id : null };
  }

  async reports(query: unknown, user: Actor) {
    const parsed = parse(reportSchema, query),
      startAt = { gte: new Date(parsed.from), lt: new Date(parsed.to) },
      businessId = user.businessId;
    const [
      byStatus,
      byStaff,
      byService,
      revenue,
      bookings,
      staff,
      timeOff,
      occupiedItems,
      refunds,
    ] = await Promise.all([
      this.db.booking.groupBy({
        by: ['status'],
        where: { businessId, startAt },
        _count: { _all: true },
      }),
      this.db.bookingItem.groupBy({
        by: ['staffId', 'bookingId'],
        where: { businessId, startAt, booking: { status: { in: ['CONFIRMED', 'COMPLETED'] } } },
        orderBy: [{ staffId: 'asc' }, { bookingId: 'asc' }],
        take: 10001,
      }),
      this.db.bookingItem.groupBy({
        by: ['serviceName'],
        where: { businessId, startAt },
        _count: { _all: true },
        _sum: { price: true, durationMinutes: true },
      }),
      this.db.payment.aggregate({
        where: {
          businessId,
          status: { in: ['CONFIRMED', 'RETAINED', 'REFUNDED'] },
          confirmedAt: startAt,
        },
        _sum: { amount: true },
      }),
      this.db.booking.findMany({
        where: { businessId, startAt },
        select: {
          startAt: true,
          endAt: true,
          staffId: true,
          status: true,
          location: { select: { timezone: true } },
        },
        take: 10001,
      }),
      this.db.staff.findMany({
        where: { businessId },
        include: { location: { select: { timezone: true } }, workingHours: true },
        take: 1001,
      }),
      this.db.timeOff.findMany({
        where: {
          businessId,
          startAt: { lt: new Date(parsed.to) },
          endAt: { gt: new Date(parsed.from) },
        },
      }),
      this.db.bookingItem.findMany({
        where: {
          businessId,
          startAt: { lt: new Date(Date.parse(parsed.to) + 240 * 60000) },
          endAt: { gt: new Date(Date.parse(parsed.from) - 240 * 60000) },
          booking: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        },
        select: {
          staffId: true,
          startAt: true,
          endAt: true,
          bufferBeforeMinutes: true,
          bufferAfterMinutes: true,
        },
        take: 10001,
      }),
      this.db.paymentRefund.aggregate({
        where: { businessId, createdAt: startAt },
        _sum: { amount: true },
      }),
    ]);
    if (
      bookings.length > 10000 ||
      occupiedItems.length > 10000 ||
      byStaff.length > 10000 ||
      staff.length > 1000
    )
      throw new BadRequestException('Reduce el período para calcular ocupación y horas pico');
    const total = byStatus.reduce((sum, r) => sum + r._count._all, 0),
      statusCount = (status: string) => byStatus.find((r) => r.status === status)?._count._all ?? 0;
    const peakHours: Record<string, number> = {};
    for (const b of bookings) {
      const hour = new Intl.DateTimeFormat('es-BO', {
        timeZone: b.location.timezone,
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(b.startAt);
      peakHours[hour] = (peakHours[hour] ?? 0) + 1;
    }
    return {
      from: parsed.from,
      to: parsed.to,
      currency: 'BOB',
      totalBookings: total,
      revenue: new Prisma.Decimal(revenue._sum.amount ?? 0)
        .minus(refunds._sum.amount ?? 0)
        .toNumber(),
      grossRevenue: Number(revenue._sum.amount ?? 0),
      refundedRevenue: Number(refunds._sum.amount ?? 0),
      cancellationRate: total ? statusCount('CANCELLED') / total : 0,
      noShowRate: total ? statusCount('NO_SHOW') / total : 0,
      byStatus,
      byStaff: staff.map((person) => ({
        staffId: person.id,
        staffName: person.name,
        bookings: byStaff.filter((row) => row.staffId === person.id).length,
        ...reportOccupancy({
          timezone: person.location.timezone,
          from: new Date(parsed.from),
          to: new Date(parsed.to),
          hours: person.workingHours,
          timeOff: timeOff.filter(
            (off) =>
              off.locationId === person.locationId && (!off.staffId || off.staffId === person.id),
          ),
          bookings: occupiedItems.filter((item) => item.staffId === person.id),
        }),
      })),
      byService,
      peakHours,
    };
  }
}
