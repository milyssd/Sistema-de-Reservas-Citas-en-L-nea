import { ApiError, type Booking, type BookingCreateRequest } from '@reservas/api-client';

export type MobileBookingInput = BookingCreateRequest & { staffIds?: Array<string | null> };
export type BookingAttempt = {
  key: string;
  body: MobileBookingInput;
  state: 'PENDING' | 'REJECTED';
  createdAt: string;
};
export interface AttemptStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

/** Conserva el mismo cuerpo y clave incluso si la app se cierra después de enviar la reserva. */
export function createBookingAttempts(
  storage: AttemptStorage,
  createKey: () => string,
  send: (body: MobileBookingInput, key: string) => Promise<Booking>,
) {
  let inFlight: Promise<Booking> | undefined;
  async function load(): Promise<BookingAttempt | null> {
    const raw = await storage.read();
    return raw ? (JSON.parse(raw) as BookingAttempt) : null;
  }
  async function perform(attempt: BookingAttempt) {
    try {
      const booking = await send(attempt.body, attempt.key);
      await storage.remove();
      return booking;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        ![401, 408, 429].includes(error.status)
      ) {
        await storage.write(JSON.stringify({ ...attempt, state: 'REJECTED' }));
      }
      throw error;
    }
  }
  const single = (work: () => Promise<Booking>) => {
    if (inFlight) return inFlight;
    inFlight = work().finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
  return {
    load,
    submit: (body: MobileBookingInput) =>
      single(async () => {
        const pending = await load();
        if (pending) {
          if (JSON.stringify(pending.body) !== JSON.stringify(body))
            throw new Error('Resuelve primero la reserva pendiente de respuesta.');
          return perform(pending);
        }
        const attempt: BookingAttempt = {
          key: createKey(),
          body,
          state: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        await storage.write(JSON.stringify(attempt));
        return perform(attempt);
      }),
    retry: () =>
      single(async () => {
        const attempt = await load();
        if (!attempt) throw new Error('No hay una reserva pendiente.');
        return perform(attempt);
      }),
    discardRejected: async () => {
      const attempt = await load();
      if (attempt?.state === 'PENDING')
        throw new Error('Consulta la respuesta antes de iniciar otra reserva.');
      await storage.remove();
    },
  };
}
