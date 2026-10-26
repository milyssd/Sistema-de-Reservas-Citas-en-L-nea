import { DateTime } from 'luxon';
export type Interval = { start: number; end: number };
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const interval of intervals
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start)) {
    const previous = result.at(-1);
    if (previous && interval.start <= previous.end)
      previous.end = Math.max(previous.end, interval.end);
    else result.push({ ...interval });
  }
  return result;
}
export function subtractIntervals(intervals: Interval[], blocks: Interval[]): Interval[] {
  let result = mergeIntervals(intervals);
  for (const block of mergeIntervals(blocks))
    result = result.flatMap((span) => {
      if (block.end <= span.start || block.start >= span.end) return [span];
      return [
        { start: span.start, end: Math.min(span.end, block.start) },
        { start: Math.max(span.start, block.end), end: span.end },
      ].filter((i) => i.end > i.start);
    });
  return result;
}
export function reportOccupancy(input: {
  timezone: string;
  from: Date;
  to: Date;
  hours: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  timeOff: { startAt: Date; endAt: Date }[];
  bookings: {
    startAt: Date;
    endAt: Date;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
  }[];
}) {
  const from = input.from.getTime(),
    to = input.to.getTime();
  const clip = (span: Interval) => ({
    start: Math.max(from, span.start),
    end: Math.min(to, span.end),
  });
  const opening: Interval[] = [];
  const localEnd = DateTime.fromJSDate(input.to, { zone: input.timezone }).startOf('day');
  for (
    let day = DateTime.fromJSDate(input.from, { zone: input.timezone })
      .startOf('day')
      .minus({ days: 1 });
    day <= localEnd;
    day = day.plus({ days: 1 })
  ) {
    for (const hours of input.hours.filter((h) => (h.dayOfWeek || 7) === day.weekday)) {
      const start = day.set({
        hour: Math.floor(hours.startMinute / 60),
        minute: hours.startMinute % 60,
      });
      let end = day
        .plus({ days: Math.floor(hours.endMinute / 1440) })
        .set({ hour: Math.floor((hours.endMinute % 1440) / 60), minute: hours.endMinute % 60 });
      if (hours.endMinute <= hours.startMinute) end = end.plus({ days: 1 });
      opening.push(clip({ start: start.toMillis(), end: end.toMillis() }));
    }
  }
  const working = subtractIntervals(
    opening,
    input.timeOff.map((b) => clip({ start: b.startAt.getTime(), end: b.endAt.getTime() })),
  );
  const busy = mergeIntervals(
    input.bookings.map((b) =>
      clip({
        start: b.startAt.getTime() - (b.bufferBeforeMinutes ?? 0) * 60000,
        end: b.endAt.getTime() + (b.bufferAfterMinutes ?? 0) * 60000,
      }),
    ),
  );
  const duration = (items: Interval[]) =>
    items.reduce((sum, i) => sum + i.end - i.start, 0) / 60000;
  const availableMinutes = duration(working),
    occupiedMinutes = duration(busy);
  const scheduledOccupiedMinutes = duration(
    mergeIntervals(
      working.flatMap((w) =>
        busy.map((b) => ({ start: Math.max(w.start, b.start), end: Math.min(w.end, b.end) })),
      ),
    ),
  );
  return {
    availableMinutes,
    occupiedMinutes,
    scheduledOccupiedMinutes,
    occupancyRate: availableMinutes > 0 ? scheduledOccupiedMinutes / availableMinutes : null,
  };
}
