import { DateTime } from 'luxon';

export interface WorkingSpan {
  /** ISO weekday: Monday = 1, Sunday = 7. An end before start crosses midnight. */
  weekday: number;
  startMinute: number;
  endMinute: number;
}
export interface BusyInterval {
  startAt: Date;
  endAt: Date;
  serviceId?: string;
  seats?: number;
  /** Capacity can only be shared by the identical class at its exact interval. */
  capacityStartAt?: Date;
  capacityEndAt?: Date;
}
export interface Slot {
  startAt: string;
  endAt: string;
  remainingCapacity: number;
}
export interface AvailabilityInput {
  timezone: string;
  from: Date;
  to: Date;
  now: Date;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  intervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  capacity: number;
  serviceId?: string;
  workingHours: WorkingSpan[];
  busy: BusyInterval[];
  timeOff: BusyInterval[];
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function calculateSlots(input: AvailabilityInput): Slot[] {
  if (input.intervalMinutes < 1 || input.durationMinutes < 1 || input.capacity < 1) {
    throw new Error('Interval, duration and capacity must be positive');
  }
  const from = DateTime.fromJSDate(input.from, { zone: input.timezone });
  const to = DateTime.fromJSDate(input.to, { zone: input.timezone });
  if (!from.isValid || !to.isValid || to <= from || to.diff(from, 'days').days > 32) {
    throw new Error('Invalid availability window (maximum 32 days)');
  }
  const earliest = input.now.getTime() + input.minNoticeMinutes * 60_000;
  const latest = DateTime.fromJSDate(input.now, { zone: input.timezone })
    .plus({ days: input.maxAdvanceDays })
    .toMillis();
  const result = new Map<string, Slot>();
  for (
    let day = from.startOf('day').minus({ days: 1 });
    day <= to.startOf('day');
    day = day.plus({ days: 1 })
  ) {
    for (const hours of input.workingHours.filter((hours) => hours.weekday === day.weekday)) {
      const begin = day.set({
        hour: Math.floor(hours.startMinute / 60),
        minute: hours.startMinute % 60,
      });
      let finish = day
        .plus({ days: Math.floor(hours.endMinute / 1440) })
        .set({ hour: Math.floor((hours.endMinute % 1440) / 60), minute: hours.endMinute % 60 });
      if (hours.endMinute <= hours.startMinute) finish = finish.plus({ days: 1 });
      for (
        let start = begin;
        start < finish;
        start = start.plus({ minutes: input.intervalMinutes })
      ) {
        if (start < from || start >= to || start.toMillis() < earliest || start.toMillis() > latest)
          continue;
        const end = start.plus({ minutes: input.durationMinutes });
        const occupiedStart = start.minus({ minutes: input.bufferBeforeMinutes });
        const occupiedEnd = end.plus({ minutes: input.bufferAfterMinutes });
        if (occupiedStart < begin || occupiedEnd > finish) continue;
        if (
          input.timeOff.some((off) =>
            overlaps(occupiedStart.toJSDate(), occupiedEnd.toJSDate(), off.startAt, off.endAt),
          )
        )
          continue;
        let occupied = 0;
        let incompatible = false;
        for (const busy of input.busy) {
          if (!overlaps(occupiedStart.toJSDate(), occupiedEnd.toJSDate(), busy.startAt, busy.endAt))
            continue;
          const sameClass =
            input.serviceId &&
            busy.serviceId === input.serviceId &&
            busy.capacityStartAt?.getTime() === start.toMillis() &&
            busy.capacityEndAt?.getTime() === end.toMillis();
          if (!sameClass) {
            incompatible = true;
            break;
          }
          occupied += busy.seats ?? 1;
        }
        if (incompatible || occupied >= input.capacity) continue;
        result.set(start.toUTC().toISO()!, {
          startAt: start.toUTC().toISO()!,
          endAt: end.toUTC().toISO()!,
          remainingCapacity: input.capacity - occupied,
        });
      }
    }
  }
  return [...result.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function canCancel(startAt: Date, now: Date, cancellationHours: number): boolean {
  return startAt.getTime() - now.getTime() >= cancellationHours * 3_600_000;
}

export const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;
