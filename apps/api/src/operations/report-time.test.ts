import { describe, expect, it } from 'vitest';
import { reportOccupancy } from './report-time';
const date = (s: string) => new Date(s);
describe('Resource occupancy denominator', () => {
  it('subtracts holiday blocks, merges shared-capacity reservations and clips the requested period', () => {
    const result = reportOccupancy({
      timezone: 'America/La_Paz',
      from: date('2026-10-26T04:00:00Z'),
      to: date('2026-10-27T04:00:00Z'),
      hours: [{ dayOfWeek: 1, startMinute: 540, endMinute: 1020 }],
      timeOff: [{ startAt: date('2026-10-26T14:00:00Z'), endAt: date('2026-10-26T15:00:00Z') }],
      bookings: [
        { startAt: date('2026-10-26T13:00:00Z'), endAt: date('2026-10-26T14:30:00Z') },
        { startAt: date('2026-10-26T13:00:00Z'), endAt: date('2026-10-26T14:30:00Z') },
      ],
    });
    expect(result.availableMinutes).toBe(420);
    expect(result.occupiedMinutes).toBe(90);
    expect(result.scheduledOccupiedMinutes).toBe(60);
    expect(result.occupancyRate).toBeCloseTo(1 / 7);
  });
  it('includes the previous day overnight shift and snapshot buffers', () => {
    const result = reportOccupancy({
      timezone: 'America/La_Paz',
      from: date('2026-10-27T04:00:00Z'),
      to: date('2026-10-28T04:00:00Z'),
      hours: [{ dayOfWeek: 1, startMinute: 1320, endMinute: 120 }],
      timeOff: [],
      bookings: [
        {
          startAt: date('2026-10-27T04:30:00Z'),
          endAt: date('2026-10-27T05:00:00Z'),
          bufferBeforeMinutes: 15,
          bufferAfterMinutes: 15,
        },
      ],
    });
    expect(result.availableMinutes).toBe(120);
    expect(result.occupiedMinutes).toBe(60);
    expect(result.occupancyRate).toBe(0.5);
  });
  it('uses real elapsed time for a timezone daylight-saving transition', () => {
    const result = reportOccupancy({
      timezone: 'America/New_York',
      from: date('2026-03-08T05:00:00Z'),
      to: date('2026-03-09T04:00:00Z'),
      hours: [{ dayOfWeek: 0, startMinute: 0, endMinute: 240 }],
      timeOff: [],
      bookings: [],
    });
    expect(result.availableMinutes).toBe(180);
    expect(result.occupancyRate).toBe(0);
  });
  it('reports a null ratio for a fully closed day', () => {
    const result = reportOccupancy({
      timezone: 'America/La_Paz',
      from: date('2026-10-26T04:00:00Z'),
      to: date('2026-10-27T04:00:00Z'),
      hours: [],
      timeOff: [],
      bookings: [],
    });
    expect(result.availableMinutes).toBe(0);
    expect(result.occupancyRate).toBeNull();
  });
});
