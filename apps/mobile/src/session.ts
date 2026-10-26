import * as SecureStore from 'expo-secure-store';
import { createApiClient } from '@reservas/api-client';
import { createSessionManager } from './session-manager';

const storageKey = 'agenda.refresh-token';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001/api/v1';

export const api = createApiClient({
  baseUrl: apiUrl,
  credentials: 'omit',
  getAccessToken: () => session.getAccessToken(),
});
const session = createSessionManager(
  {
    read: () => SecureStore.getItemAsync(storageKey),
    write: (token) =>
      SecureStore.setItemAsync(storageKey, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    remove: () => SecureStore.deleteItemAsync(storageKey),
  },
  api,
);
export const login = session.login;
export const register = session.register;
export const restoreSession = session.restore;
export const refreshSession = session.refresh;
export const logout = session.logout;
export const forgetSession = session.forget;
