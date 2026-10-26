import type { components, operations } from './schema';
export type { paths, operations, components } from './schema';
export { createGeneratedApiClient } from './generated-client';

/** Tipos derivados del OpenAPI real: una modificación del contrato se propaga a web y móvil. */
export type AuthResult =
  operations['AuthController_login']['responses'][200]['content']['application/json'];
export type User = AuthResult['user'];
export type Role = User['role'];
export type LoginRequest =
  operations['AuthController_login']['requestBody']['content']['application/json'];
export type RegisterRequest =
  operations['AuthController_register']['requestBody']['content']['application/json'];
export type RefreshRequest =
  operations['AuthController_refresh']['requestBody']['content']['application/json'];
export type Booking = components['schemas']['BookingDto'];
export type BookingPage = components['schemas']['BookingPageDto'];
export type BookingCreateRequest =
  operations['BookingsController_create']['requestBody']['content']['application/json'];
export type HoldCreateRequest =
  operations['BookingsController_hold']['requestBody']['content']['application/json'];
export type Hold = components['schemas']['HoldDto'];

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}
export interface Problem {
  type?: string;
  title?: string;
  detail?: string;
  status?: number;
  code?: string;
  requestId?: string;
  challenge?: {
    token: string;
    difficulty: number;
    expiresAt: string;
    algorithm: 'SHA-256';
    input: 'token:nonce';
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: Problem,
  ) {
    super(problem.detail || problem.title || 'No se pudo completar la solicitud.');
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Reintenta solamente operaciones seguras o POST con Idempotency-Key. */
  retries?: number;
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
  credentials?: RequestCredentials;
  onUnauthorized?: () => void | Promise<void>;
  fetch?: typeof globalThis.fetch;
}

export function createApiClient(options: ApiClientOptions) {
  const transport = options.fetch || globalThis.fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//'))
      throw new Error('La ruta debe ser relativa a la API.');
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'reservas-client');
    const token = await options.getAccessToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (init.body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
    const method = (init.method || 'GET').toUpperCase();
    const safeToRetry =
      ['GET', 'HEAD', 'OPTIONS'].includes(method) ||
      (method === 'POST' && headers.has('Idempotency-Key'));
    const retries = safeToRetry ? Math.min(Math.max(init.retries ?? 1, 0), 3) : 0;
    const { retries: _retries, ...fetchOptions } = init;
    void _retries;
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await transport(`${baseUrl}${path}`, {
          ...fetchOptions,
          method,
          credentials: options.credentials ?? 'include',
          headers,
          body:
            init.body === undefined
              ? undefined
              : isForm
                ? (init.body as FormData)
                : JSON.stringify(init.body),
        });
      } catch (error) {
        if (attempt >= retries || init.signal?.aborted) throw error;
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
        continue;
      }
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
        continue;
      }
      if (!response.ok) {
        const problem: Problem = await response
          .json()
          .catch(() => ({ title: 'No se pudo completar la solicitud.' }));
        if (response.status === 401) await options.onUnauthorized?.();
        throw new ApiError(response.status, problem);
      }
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    }
  }

  return {
    request,
    register: (body: RegisterRequest) =>
      request<AuthResult>('/auth/register', { method: 'POST', body, retries: 0 }),
    login: (
      email: string,
      password: string,
      platform: 'web' | 'mobile' = 'web',
      totpCode?: string,
    ) =>
      request<AuthResult>('/auth/login', {
        method: 'POST',
        body: {
          email,
          password,
          platform,
          ...(totpCode ? { totpCode } : {}),
        } satisfies LoginRequest,
        retries: 0,
      }),
    refresh: (platform: 'web' | 'mobile' = 'web', refreshToken?: string) =>
      request<AuthResult>('/auth/refresh', {
        method: 'POST',
        body: { platform, ...(refreshToken ? { refreshToken } : {}) } satisfies RefreshRequest,
        retries: 0,
      }),
    logout: (platform: 'web' | 'mobile' = 'web', refreshToken?: string) =>
      request<void>('/auth/logout', {
        method: 'POST',
        body: { platform, ...(refreshToken ? { refreshToken } : {}) },
      }),
    me: () => request<User>('/auth/me'),
    bookings: (cursor?: string) =>
      request<BookingPage>(`/bookings${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
    catalog: <T = unknown>() => request<T>('/catalog'),
    availability: <T = unknown>(params: Record<string, string>) =>
      request<T>(`/availability?${new URLSearchParams(params)}`),
    createBooking: (body: BookingCreateRequest, idempotencyKey: string) =>
      request<Booking>('/bookings', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    createHold: (body: HoldCreateRequest) =>
      request<Hold>('/bookings/holds', { method: 'POST', body }),
    cancelBooking: <T = Booking>(id: string, version: number, body: unknown = {}) =>
      request<T>(`/bookings/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        body,
        headers: { 'If-Match': String(version) },
      }),
    rescheduleBooking: <T = Booking>(id: string, version: number, body: unknown) =>
      request<T>(`/bookings/${encodeURIComponent(id)}/reschedule`, {
        method: 'POST',
        body,
        headers: { 'If-Match': String(version) },
      }),
  };
}
