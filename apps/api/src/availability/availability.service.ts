import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, type Service, type StaffService } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { calculateSlots, type BusyInterval } from './engine';
import { createAvailabilityCache } from './availability.cache';

export type Database = Prisma.TransactionClient;
export interface AvailabilityQuery {
  serviceIds: string[];
  locationId?: string;
  staffId?: string;
  staffIds?: Array<string | null>;
  from: string;
  to: string;
}
export interface BundlePart extends Service {
  effectiveDuration: number;
  effectivePrice: Prisma.Decimal;
  effectiveDeposit: Prisma.Decimal;
  offsetMinutes: number;
  staffId?: string;
}
export function bundleServices(
  services: Service[],
  mappings: StaffService[],
): {
  parts: BundlePart[];
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  capacity: number;
} {
  let offset = 0;
  const parts = services.map((service, index) => {
    const override = mappings.find((mapping) => mapping.serviceId === service.id);
    const effectiveDuration = override?.durationMinutes ?? service.durationMinutes;
    const effectivePrice = override?.price ?? service.price;
    const effectiveDeposit =
      service.depositPercent === null
        ? service.depositAmount
        : effectivePrice.mul(service.depositPercent).div(100).toDecimalPlaces(2);
    if (index > 0)
      offset += (services[index - 1]?.bufferAfterMinutes ?? 0) + service.bufferBeforeMinutes;
    const part = {
      ...service,
      effectiveDuration,
      effectivePrice,
      effectiveDeposit,
      offsetMinutes: offset,
    };
    offset += effectiveDuration;
    return part;
  });
  return {
    parts,
    durationMinutes: offset,
    bufferBeforeMinutes: services[0]?.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: services.at(-1)?.bufferAfterMinutes ?? 0,
    capacity: services.length === 1 ? services[0]!.capacity : 1,
  };
}

@Injectable()
export class AvailabilityService {
  private readonly cache = createAvailabilityCache();
  async onModuleDestroy() {
    await this.cache.close();
  }
  async invalidate() {
    await this.cache.invalidate(this.businessId());
  }
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  businessId(): string {
    const value = process.env.BUSINESS_ID;
    if (!value)
      throw new ServiceUnavailableException({
        code: 'TENANT_NOT_CONFIGURED',
        message: 'El negocio no está configurado.',
      });
    return value;
  }

  async configuration(db: Database = this.prisma) {
    const business = await db.business.findUnique({ where: { id: this.businessId() } });
    if (!business) throw new NotFoundException('Negocio no encontrado.');
    if (business.maintenanceMode)
      throw new ServiceUnavailableException({
        code: 'MAINTENANCE',
        message: 'Las reservas están en mantenimiento.',
      });
    return business;
  }

  async services(serviceIds: string[], db: Database = this.prisma, online = true) {
    if (
      serviceIds.length === 0 ||
      serviceIds.length > 8 ||
      new Set(serviceIds).size !== serviceIds.length
    ) {
      throw new BadRequestException('Elige de uno a ocho servicios distintos.');
    }
    const services = await db.service.findMany({
      where: {
        businessId: this.businessId(),
        id: { in: serviceIds },
        active: true,
        ...(online ? { onlineBookable: true } : {}),
      },
    });
    if (services.length !== serviceIds.length)
      throw new NotFoundException('Servicio no disponible.');
    return serviceIds.map((id) => services.find((service) => service.id === id)!);
  }

  async candidates(
    query: Pick<AvailabilityQuery, 'locationId' | 'staffId' | 'serviceIds'>,
    db: Database = this.prisma,
  ) {
    return db.staff.findMany({
      where: {
        businessId: this.businessId(),
        active: true,
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.staffId ? { id: query.staffId } : {}),
        AND: query.serviceIds.map((serviceId) => ({
          staffServices: { some: { businessId: this.businessId(), serviceId } },
        })),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }

  async forStaff(
    query: AvailabilityQuery & { staffId: string },
    db: Database = this.prisma,
    options: {
      excludeBookingId?: string;
      excludeHoldHash?: string;
      now?: Date;
      online?: boolean;
      minuteGranularity?: boolean;
    } = {},
  ) {
    const now = options.now ?? new Date();
    const businessId = this.businessId();
    const business = await this.configuration(db);
    const services = await this.services(query.serviceIds, db, options.online ?? true);
    const staff = await db.staff.findFirst({
      where: {
        id: query.staffId,
        businessId,
        active: true,
        ...(query.locationId ? { locationId: query.locationId } : {}),
      },
    });
    if (!staff) throw new NotFoundException('Profesional no disponible.');
    const location = await db.location.findFirst({
      where: { id: staff.locationId, businessId, active: true },
    });
    if (!location) throw new NotFoundException('Sede no disponible.');
    const mappings = await db.staffService.findMany({
      where: { staffId: staff.id, businessId, serviceId: { in: query.serviceIds } },
    });
    if (mappings.length !== services.length)
      return { data: [], timezone: location.timezone, bundle: bundleServices(services, mappings) };
    const bundle = bundleServices(services, mappings);
    if (bundle.durationMinutes > 1440)
      throw new BadRequestException('La cita no puede durar más de 24 horas.');
    const from = new Date(query.from);
    const to = new Date(query.to);
    // Include buffers across the request boundaries; a previous day's appointment can overlap today.
    const rangeStart = new Date(from.getTime() - 2 * 86_400_000);
    const rangeEnd = new Date(to.getTime() + 2 * 86_400_000);
    const working = await db.workingHours.findMany({
      where: { businessId, staffId: staff.id, locationId: location.id },
    });
    const timeOff = await db.timeOff.findMany({
      where: {
        businessId,
        locationId: location.id,
        OR: [{ staffId: null }, { staffId: staff.id }],
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
    });
    const items = await db.bookingItem.findMany({
      where: {
        businessId,
        staffId: staff.id,
        ...(options.excludeBookingId ? { bookingId: { not: options.excludeBookingId } } : {}),
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
        booking: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      },
    });
    const holds = await db.hold.findMany({
      where: {
        businessId,
        OR: [{ staffId: staff.id }, { items: { some: { staffId: staff.id, businessId } } }],
        consumedAt: null,
        expiresAt: { gt: now },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
        ...(options.excludeHoldHash ? { tokenHash: { not: options.excludeHoldHash } } : {}),
      },
      include: { items: true },
    });
    const busy: BusyInterval[] = items.map((item) => ({
      startAt: new Date(item.startAt.getTime() - item.bufferBeforeMinutes * 60_000),
      endAt: new Date(item.endAt.getTime() + item.bufferAfterMinutes * 60_000),
      serviceId: item.serviceId,
      capacityStartAt: item.startAt,
      capacityEndAt: item.endAt,
    }));
    for (const hold of holds) {
      if (hold.items.length) {
        for (const item of hold.items.filter((part) => part.staffId === staff.id))
          busy.push({
            startAt: new Date(item.startAt.getTime() - item.bufferBeforeMinutes * 60_000),
            endAt: new Date(item.endAt.getTime() + item.bufferAfterMinutes * 60_000),
            serviceId: item.serviceId,
            capacityStartAt: item.startAt,
            capacityEndAt: item.endAt,
          });
      } else if (hold.staffId === staff.id)
        busy.push({
          startAt: new Date(hold.startAt.getTime() - hold.bufferBeforeMinutes * 60_000),
          endAt: new Date(hold.endAt.getTime() + hold.bufferAfterMinutes * 60_000),
          serviceId:
            Array.isArray(hold.serviceIds) && hold.serviceIds.length > 1
              ? undefined
              : hold.serviceId,
          capacityStartAt: hold.startAt,
          capacityEndAt: hold.endAt,
        });
    }
    const data = calculateSlots({
      timezone: location.timezone,
      from,
      to,
      now,
      ...bundle,
      intervalMinutes: options.minuteGranularity ? 1 : business.slotIntervalMinutes,
      minNoticeMinutes: business.minimumNoticeMinutes,
      maxAdvanceDays: business.maximumAdvanceDays,
      serviceId: services.length === 1 ? services[0]!.id : undefined,
      workingHours: working.map((hours) => ({
        weekday: hours.dayOfWeek === 0 ? 7 : hours.dayOfWeek,
        startMinute: hours.startMinute,
        endMinute: hours.endMinute,
      })),
      busy,
      timeOff,
    });
    return {
      data: data.map((slot) => ({ ...slot, staffId: staff.id, locationId: location.id })),
      timezone: location.timezone,
      bundle,
    };
  }

  async candidateResources(
    query: Pick<AvailabilityQuery, 'serviceIds' | 'staffId' | 'staffIds' | 'locationId'>,
    db: Database = this.prisma,
  ) {
    if (!query.staffIds) return this.candidates(query, db);
    if (query.staffId || query.staffIds.length !== query.serviceIds.length || !query.locationId) {
      throw new BadRequestException(
        'staffIds debe indicar un profesional por servicio y una sede única.',
      );
    }
    const business = await this.configuration(db);
    if ((business.featureFlags as Record<string, unknown> | null)?.multiStaffBookings !== true) {
      throw new BadRequestException({
        code: 'MULTI_STAFF_DISABLED',
        message: 'El negocio no habilitó citas con varios profesionales.',
      });
    }
    const groups = await Promise.all(
      query.serviceIds.map((serviceId, index) =>
        this.candidates(
          {
            serviceIds: [serviceId],
            staffId: query.staffIds![index] ?? undefined,
            locationId: query.locationId,
          },
          db,
        ),
      ),
    );
    if (groups.some((group) => group.length === 0))
      throw new NotFoundException('Algún profesional no ofrece el servicio en esta sede.');
    return [...new Map(groups.flat().map((staff) => [staff.id, staff])).values()];
  }

  async plans(
    query: AvailabilityQuery,
    db: Database = this.prisma,
    options: {
      excludeBookingId?: string;
      excludeHoldHash?: string;
      online?: boolean;
      now?: Date;
      allowedStaffIds?: string[];
    } = {},
  ) {
    const resources = (await this.candidateResources(query, db)).filter(
      (staff) => !options.allowedStaffIds || options.allowedStaffIds.includes(staff.id),
    );
    if (!query.staffIds) {
      const plans: ResolvedPlan[] = [];
      let timezone = 'America/La_Paz';
      for (const staff of resources) {
        const result = await this.forStaff({ ...query, staffId: staff.id }, db, options);
        timezone = result.timezone;
        for (const slot of result.data) {
          const parts = result.bundle.parts.map((part) => ({ ...part, staffId: staff.id }));
          plans.push(
            this.resolvedPlan(slot.startAt, parts, slot.remainingCapacity, slot.locationId),
          );
        }
      }
      return { plans, timezone };
    }
    const services = await this.services(query.serviceIds, db, options.online ?? true);
    const business = await this.configuration(db);
    const workloads =
      business.assignmentRule === 'LEAST_BUSY'
        ? await db.bookingItem.groupBy({
            by: ['staffId'],
            where: {
              businessId: business.id,
              staffId: { in: resources.map((staff) => staff.id) },
              startAt: { gte: new Date(query.from), lt: new Date(query.to) },
              booking: { status: { in: ['PENDING', 'CONFIRMED'] } },
            },
            _count: { _all: true },
          })
        : [];
    resources.sort(
      (a, b) =>
        (workloads.find((row) => row.staffId === a.id)?._count._all ?? 0) -
          (workloads.find((row) => row.staffId === b.id)?._count._all ?? 0) ||
        a.sortOrder - b.sortOrder ||
        a.id.localeCompare(b.id),
    );
    const stages: Array<
      Array<{
        part: BundlePart;
        slots: Array<{
          staffId: string;
          locationId: string;
          startAt: string;
          endAt: string;
          remainingCapacity: number;
        }>;
        byTime: Map<
          number,
          {
            staffId: string;
            locationId: string;
            startAt: string;
            endAt: string;
            remainingCapacity: number;
          }
        >;
      }>
    > = [];
    let timezone = 'America/La_Paz';
    for (let index = 0; index < services.length; index++) {
      const service = services[index]!;
      const group = [];
      for (const staff of resources.filter(
        (staff) => !query.staffIds![index] || staff.id === query.staffIds![index],
      )) {
        const result = await this.forStaff(
          {
            serviceIds: [service.id],
            staffId: staff.id,
            locationId: query.locationId,
            from: query.from,
            to:
              index === 0
                ? query.to
                : new Date(
                    Math.min(
                      Date.parse(query.to) + 86_400_000,
                      Date.parse(query.from) + 32 * 86_400_000,
                    ),
                  ).toISOString(),
          },
          db,
          { ...options, minuteGranularity: index > 0 },
        );
        if (!result.data.length) continue;
        timezone = result.timezone;
        group.push({
          part: { ...result.bundle.parts[0]!, staffId: staff.id },
          slots: result.data,
          byTime: new Map(result.data.map((slot) => [Date.parse(slot.startAt), slot])),
        });
      }
      stages.push(group);
    }
    const plans: ResolvedPlan[] = [];
    if (stages.some((stage) => stage.length === 0)) return { plans, timezone };
    const seen = new Set<string>();
    for (const candidate of stages[0] ?? [])
      for (const first of candidate.slots) {
        const start = Date.parse(first.startAt);
        if (seen.has(first.startAt)) continue;
        const failed = new Set<string>();
        const search = (
          index: number,
          parts: BundlePart[],
          remainingCapacity: number,
        ): ResolvedPlan | null => {
          if (index === services.length)
            return this.resolvedPlan(first.startAt, parts, remainingCapacity, first.locationId);
          const previous = parts.at(-1)!;
          const offsetMinutes =
            previous.offsetMinutes +
            previous.effectiveDuration +
            previous.bufferAfterMinutes +
            services[index]!.bufferBeforeMinutes;
          const searchKey = `${index}:${offsetMinutes}`;
          if (offsetMinutes > 1440 || failed.has(searchKey)) return null;
          for (const next of stages[index] ?? []) {
            const slot = next.byTime.get(start + offsetMinutes * 60_000);
            if (!slot || offsetMinutes + next.part.effectiveDuration > 1440) continue;
            const found = search(
              index + 1,
              [...parts, { ...next.part, offsetMinutes }],
              Math.min(remainingCapacity, slot.remainingCapacity),
            );
            if (found) return found;
          }
          failed.add(searchKey);
          return null;
        };
        const plan = search(1, [{ ...candidate.part, offsetMinutes: 0 }], first.remainingCapacity);
        if (plan) {
          plans.push(plan);
          seen.add(first.startAt);
        }
      }
    return { plans, timezone };
  }

  private resolvedPlan(
    startAt: string,
    parts: BundlePart[],
    remainingCapacity: number,
    locationId: string,
  ): ResolvedPlan {
    const last = parts.at(-1)!;
    const durationMinutes = last.offsetMinutes + last.effectiveDuration;
    const segments = parts.map((part) => ({
      serviceId: part.id,
      staffId: part.staffId!,
      startAt: new Date(Date.parse(startAt) + part.offsetMinutes * 60_000).toISOString(),
      endAt: new Date(
        Date.parse(startAt) + (part.offsetMinutes + part.effectiveDuration) * 60_000,
      ).toISOString(),
      bufferBeforeMinutes: part.bufferBeforeMinutes,
      bufferAfterMinutes: part.bufferAfterMinutes,
    }));
    return {
      slot: {
        staffId: parts[0]!.staffId!,
        staffIds: parts.map((part) => part.staffId!),
        locationId,
        startAt,
        endAt: new Date(Date.parse(startAt) + durationMinutes * 60_000).toISOString(),
        remainingCapacity,
        segments,
        totalAmount: parts
          .reduce((sum, part) => sum.add(part.effectivePrice), new Prisma.Decimal(0))
          .toNumber(),
        depositAmount: parts
          .reduce((sum, part) => sum.add(part.effectiveDeposit), new Prisma.Decimal(0))
          .toNumber(),
      },
      bundle: {
        parts,
        durationMinutes,
        bufferBeforeMinutes: parts[0]!.bufferBeforeMinutes,
        bufferAfterMinutes: last.bufferAfterMinutes,
        capacity: Math.min(...parts.map((part) => part.capacity)),
      },
    };
  }

  async list(query: AvailabilityQuery) {
    const cached = await this.cache.get<AvailabilityResponse>(this.businessId(), query);
    if (cached) return cached;
    const { plans, timezone } = await this.plans(query);
    const data = plans
      .map((plan) => plan.slot)
      .sort((a, b) => a.startAt.localeCompare(b.startAt) || a.staffId.localeCompare(b.staffId));
    const response = { data, timezone };
    await this.cache.set(this.businessId(), query, response);
    return response;
  }
}

export interface PlannedSegment {
  serviceId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}
export interface PlannedSlot {
  staffId: string;
  staffIds: string[];
  locationId: string;
  startAt: string;
  endAt: string;
  remainingCapacity: number;
  segments: PlannedSegment[];
  totalAmount: number;
  depositAmount: number;
}
export interface ResolvedPlan {
  slot: PlannedSlot;
  bundle: ReturnType<typeof bundleServices>;
}
export interface AvailabilityResponse {
  data: PlannedSlot[];
  timezone: string;
}
