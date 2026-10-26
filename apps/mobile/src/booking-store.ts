import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createBookingAttempts } from './booking-attempt';
import { api } from './session';

export function bookingAttempts(userId: string) {
  const key = `agenda.pending-booking.${userId}`;
  return createBookingAttempts(
    {
      read: () => SecureStore.getItemAsync(key),
      write: (value) =>
        SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      remove: () => SecureStore.deleteItemAsync(key),
    },
    () => Crypto.randomUUID(),
    (body, idempotencyKey) => api.createBooking(body, idempotencyKey),
  );
}
