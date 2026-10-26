import { describe, it, expect } from 'vitest';
import {
  calculateSlots,
  canCancel,
  overlaps,
  type AvailabilityInput,
} from '../src/availability/engine';

const base: AvailabilityInput = {
  timezone: 'America/La_Paz',
  from: new Date('2030-01-07T00:00:00Z'),
  to: new Date('2030-01-08T00:00:00Z'),
  now: new Date('2030-01-01T00:00:00Z'),
  durationMinutes: 60,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  intervalMinutes: 30,
  minNoticeMinutes: 0,
  maxAdvanceDays: 90,
  capacity: 1,
  serviceId: 'cut',
  workingHours: [{ weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 }],
  busy: [],
  timeOff: [],
};
describe('availability engine', () => {
  it('calculates Bolivian local hours and serializes UTC', () => {
    const slots = calculateSlots(base);
    expect(slots).toHaveLength(5);
    expect(slots[0]?.startAt).toBe('2030-01-07T13:00:00.000Z');
    expect(slots.at(-1)?.endAt).toBe('2030-01-07T16:00:00.000Z');
  });
  it('respects before/after buffers and half-open overlap', () => {
    const slots = calculateSlots({
      ...base,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      busy: [{ startAt: new Date('2030-01-07T14:30Z'), endAt: new Date('2030-01-07T15:30Z') }],
    });
    expect(slots).toHaveLength(0);
    expect(overlaps(new Date(0), new Date(10), new Date(10), new Date(20))).toBe(false);
  });
  it('eliminates a holiday and partial time off', () => {
    expect(
      calculateSlots({
        ...base,
        timeOff: [{ startAt: new Date('2030-01-07T04:00Z'), endAt: new Date('2030-01-08T04:00Z') }],
      }),
    ).toEqual([]);
    expect(
      calculateSlots({
        ...base,
        timeOff: [{ startAt: new Date('2030-01-07T13:00Z'), endAt: new Date('2030-01-07T14:00Z') }],
      })[0]?.startAt,
    ).toBe('2030-01-07T14:00:00.000Z');
  });
  it('includes an overnight shift originating the previous local day', () => {
    const slots = calculateSlots({
      ...base,
      from: new Date('2030-01-08T04:00Z'),
      to: new Date('2030-01-08T07:00Z'),
      workingHours: [{ weekday: 1, startMinute: 22 * 60, endMinute: 2 * 60 }],
    });
    expect(slots.map((slot) => slot.startAt)).toEqual([
      '2030-01-08T04:00:00.000Z',
      '2030-01-08T04:30:00.000Z',
      '2030-01-08T05:00:00.000Z',
    ]);
  });
  it('evaluates changed branch timezone rather than server timezone', () => {
    const slots = calculateSlots({ ...base, timezone: 'Europe/Madrid' });
    expect(slots[0]?.startAt).toBe('2030-01-07T08:00:00.000Z');
  });
  it('handles daylight-saving transition with unique chronological instants', () => {
    const slots = calculateSlots({
      ...base,
      timezone: 'America/New_York',
      from: new Date('2030-03-10T05:00Z'),
      to: new Date('2030-03-11T04:00Z'),
      now: new Date('2030-03-01T00:00Z'),
      workingHours: [{ weekday: 7, startMinute: 60, endMinute: 240 }],
    });
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.startAt)).toEqual([
      '2030-03-10T06:00:00.000Z',
      '2030-03-10T06:30:00.000Z',
      '2030-03-10T07:00:00.000Z',
    ]);
  });
  it('shares seats only for exactly matching class slots', () => {
    const slots = calculateSlots({
      ...base,
      capacity: 3,
      busy: [
        {
          startAt: new Date('2030-01-07T13:00Z'),
          endAt: new Date('2030-01-07T14:00Z'),
          serviceId: 'cut',
          capacityStartAt: new Date('2030-01-07T13:00Z'),
          capacityEndAt: new Date('2030-01-07T14:00Z'),
          seats: 2,
        },
      ],
    });
    expect(slots[0]?.remainingCapacity).toBe(1);
    expect(slots.some((s) => s.startAt === '2030-01-07T13:30:00.000Z')).toBe(false);
  });
  it('excludes full slots, active holds, and slots outside notice/horizon', () => {
    const busy = [{ startAt: new Date('2030-01-07T13:00Z'), endAt: new Date('2030-01-07T14:00Z') }];
    expect(calculateSlots({ ...base, busy })[0]?.startAt).toBe('2030-01-07T14:00:00.000Z');
    expect(
      calculateSlots({ ...base, now: new Date('2030-01-07T13:00Z'), minNoticeMinutes: 90 })[0]
        ?.startAt,
    ).toBe('2030-01-07T14:30:00.000Z');
    expect(calculateSlots({ ...base, maxAdvanceDays: 1 })).toEqual([]);
  });
  it('rejects unbounded intervals', () => {
    expect(() => calculateSlots({ ...base, intervalMinutes: 0 })).toThrow();
    expect(() => calculateSlots({ ...base, to: new Date('2031-01-01Z') })).toThrow();
  });
});
describe('cancellation policy', () => {
  it('accepts the exact cutoff, rejects a late cancellation and past appointments', () => {
    const start = new Date('2030-01-07T12:00Z');
    expect(canCancel(start, new Date('2030-01-07T00:00Z'), 12)).toBe(true);
    expect(canCancel(start, new Date('2030-01-07T00:00:00.001Z'), 12)).toBe(false);
    expect(canCancel(start, new Date('2030-01-07T13:00Z'), 0)).toBe(false);
  });
});
