import { createApiClient } from '@reservas/api-client';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
let accessToken: string | undefined;
export const setAccessToken = (token?: string) => {
  accessToken = token;
};
export const api = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => accessToken,
  credentials: 'include',
});
export const authHeaders = () => ({
  'X-Requested-With': 'reservas-client',
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});
