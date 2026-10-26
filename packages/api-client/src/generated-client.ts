import createClient from 'openapi-fetch';
import type { paths } from './schema';

/** Cliente generado por el contrato real OpenAPI; baseUrl incluye /api/v1 sólo si las rutas no lo incluyen. */
export function createGeneratedApiClient(baseUrl: string, accessToken?: string) {
  return createClient<paths>({
    baseUrl,
    credentials: 'include',
    headers: {
      'X-Requested-With': 'reservas-client',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}
