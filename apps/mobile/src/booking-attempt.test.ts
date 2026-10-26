import { describe, expect, it, vi } from 'vitest';
import { ApiError, type Booking } from '@reservas/api-client';
import { createBookingAttempts } from './booking-attempt';

const body = {
  locationId: 'l1',
  serviceIds: ['s1', 's2'],
  staffIds: ['p1', 'p2'],
  startAt: '2027-01-05T14:00:00Z',
  source: 'MOBILE' as const,
};
const booking = { id: 'b1', code: 'BOOK1234' } as Booking;
function setup() {
  let value: string | null = null;
  const storage = {
    read: vi.fn(async () => value),
    write: vi.fn(async (input: string) => {
      value = input;
    }),
    remove: vi.fn(async () => {
      value = null;
    }),
  };
  const send = vi.fn(async () => booking);
  const createKey = vi.fn(() => 'unique-idempotency-key');
  return {
    storage,
    send,
    createKey,
    create: () => createBookingAttempts(storage, createKey, send),
  };
}
describe('Reservas con conexión inestable', () => {
  it('persiste antes del envío y reutiliza cuerpo/clave tras reiniciar la aplicación', async () => {
    const { create, send, storage, createKey } = setup();
    send.mockImplementationOnce(async () => {
      expect(await storage.read()).not.toBeNull();
      throw new TypeError('Respuesta perdida');
    });
    await expect(create().submit(body)).rejects.toThrow('Respuesta perdida');
    const recovered = create();
    await expect(recovered.retry()).resolves.toEqual(booking);
    expect(createKey).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenNthCalledWith(1, body, 'unique-idempotency-key');
    expect(send).toHaveBeenNthCalledWith(2, body, 'unique-idempotency-key');
    expect(await storage.read()).toBeNull();
  });
  it('deduplica toques simultáneos en confirmar', async () => {
    const { create, send } = setup();
    const attempts = create();
    await Promise.all([attempts.submit(body), attempts.submit(body), attempts.submit(body)]);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('no sustituye un intento desconocido por datos nuevos', async () => {
    const { create, send } = setup();
    send.mockRejectedValueOnce(new TypeError('Sin red'));
    const attempts = create();
    await expect(attempts.submit(body)).rejects.toThrow();
    await expect(attempts.submit({ ...body, startAt: '2027-01-06T14:00:00Z' })).rejects.toThrow(
      'Resuelve primero',
    );
    await expect(attempts.discardRejected()).rejects.toThrow('Consulta la respuesta');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('permite corregir el formulario sólo después de un rechazo explícito de la API', async () => {
    const { create, send } = setup();
    send.mockRejectedValueOnce(
      new ApiError(409, { code: 'SLOT_UNAVAILABLE', detail: 'Turno ocupado' }),
    );
    const attempts = create();
    await expect(attempts.submit(body)).rejects.toThrow('Turno ocupado');
    expect((await attempts.load())?.state).toBe('REJECTED');
    await attempts.discardRejected();
    expect(await attempts.load()).toBeNull();
  });
  it('conserva el intento para renovar la sesión después de un 401', async () => {
    const { create, send } = setup();
    send.mockRejectedValueOnce(new ApiError(401, { title: 'Sesión vencida' }));
    const attempts = create();
    await expect(attempts.submit(body)).rejects.toThrow();
    expect((await attempts.load())?.state).toBe('PENDING');
    await attempts.retry();
    expect(send).toHaveBeenLastCalledWith(body, 'unique-idempotency-key');
  });
});
