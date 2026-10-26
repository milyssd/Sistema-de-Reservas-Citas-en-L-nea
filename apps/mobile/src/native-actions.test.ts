import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Booking } from '@reservas/api-client';
const mocks = vi.hoisted(() => ({
  createEvent: vi.fn(async () => ({ action: 'done' })),
  permissions: vi.fn(async () => ({ granted: true })),
  requestPermissions: vi.fn(async () => ({ granted: true })),
  scheduled: vi.fn(async () => [
    { identifier: 'old', content: { data: { bookingId: 'b1' } } },
    { identifier: 'other', content: { data: { bookingId: 'b2' } } },
  ]),
  cancel: vi.fn(async () => undefined),
  schedule: vi.fn(async (_input: unknown) => 'n1'),
  request: vi.fn(async () => ({ id: 'device1' })),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-calendar/legacy', () => ({
  isAvailableAsync: async () => true,
  createEventInCalendarAsync: mocks.createEvent,
}));
vi.mock('expo-device', () => ({ isDevice: true }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
}));
vi.mock('./session', () => ({ api: { request: mocks.request } }));
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: async () => undefined,
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: mocks.permissions,
  requestPermissionsAsync: mocks.requestPermissions,
  getAllScheduledNotificationsAsync: mocks.scheduled,
  cancelScheduledNotificationAsync: mocks.cancel,
  scheduleNotificationAsync: mocks.schedule,
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[test-token]' }),
  cancelAllScheduledNotificationsAsync: async () => undefined,
}));
import {
  addToCalendar,
  cancelLocalReminders,
  enablePush,
  scheduleLocalReminders,
} from './native-actions';

const booking = {
  id: 'b1',
  code: 'CODE1234',
  status: 'CONFIRMED',
  startAt: '2027-01-05T14:00:00Z',
  endAt: '2027-01-05T15:00:00Z',
  items: [{ serviceName: 'Corte' }],
  location: { name: 'Centro', address: 'La Paz', timezone: 'America/La_Paz' },
} as Booking;
beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
});
describe('Integraciones nativas', () => {
  it('abre el formulario nativo con instantes UTC y zona de la sede, sin leer calendarios', async () => {
    await addToCalendar(booking);
    expect(mocks.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date(booking.startAt),
        endDate: new Date(booking.endAt),
        timeZone: 'America/La_Paz',
        url: 'agendaabierta://booking/b1',
      }),
    );
  });
  it('reemplaza sólo recordatorios de la cita al reprogramar y calcula 24h/2h', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    expect(await scheduleLocalReminders(booking)).toBe(2);
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith('old');
    expect(mocks.schedule.mock.calls[0]?.[0]).toMatchObject({
      trigger: { date: new Date('2027-01-04T14:00:00Z') },
    });
    expect(mocks.schedule.mock.calls[1]?.[0]).toMatchObject({
      trigger: { date: new Date('2027-01-05T12:00:00Z') },
    });
  });
  it('cancelar elimina sus avisos y conserva los de otras citas', async () => {
    await cancelLocalReminders('b1');
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith('old');
  });
  it('no solicita permiso ni registra un token sin configuración de proyecto', async () => {
    await expect(enablePush()).rejects.toThrow('EXPO_PUBLIC_EAS_PROJECT_ID');
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('registra el token con el mismo endpoint autenticado de la API', async () => {
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = 'project-test';
    await enablePush();
    expect(mocks.request).toHaveBeenCalledWith('/devices', {
      method: 'POST',
      body: { platform: 'EXPO', token: 'ExpoPushToken[test-token]' },
    });
  });
});
