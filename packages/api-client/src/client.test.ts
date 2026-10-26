import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './index';

describe('API client', () => {
  it('sends bearer and CSRF headers without storing credentials', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'u1' }), { status: 200 }));
    const client = createApiClient({
      baseUrl: 'https://agenda.example/api/v1',
      getAccessToken: () => 'token',
      fetch,
    });
    await client.me();
    const [url, options] = fetch.mock.calls[0]!;
    expect(url).toBe('https://agenda.example/api/v1/auth/me');
    expect(options.headers.get('Authorization')).toBe('Bearer token');
    expect(options.headers.get('X-Requested-With')).toBe('reservas-client');
  });
  it('preserves the idempotency key during retry after network failure', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'b1' })));
    const client = createApiClient({ baseUrl: 'https://agenda.example/api/v1', fetch });
    await client.createBooking(
      { locationId: 'l1', serviceIds: ['s1'], startAt: '2026-11-01T13:00:00Z' },
      'same-key',
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [, options] of fetch.mock.calls)
      expect(options.headers.get('Idempotency-Key')).toBe('same-key');
  });
  it('never retries token rotation or non-idempotent POST', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('network'));
    const client = createApiClient({ baseUrl: 'https://agenda.example/api/v1', fetch });
    await expect(client.refresh('mobile', 'refresh')).rejects.toThrow('network');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('exposes RFC7807 code and requestId', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ title: 'No autorizado', code: 'FORBIDDEN', requestId: 'r1' }),
          { status: 403 },
        ),
      );
    const client = createApiClient({ baseUrl: 'https://agenda.example/api/v1', fetch });
    await expect(client.me()).rejects.toMatchObject({
      status: 403,
      problem: { code: 'FORBIDDEN', requestId: 'r1' },
    } satisfies Partial<ApiError>);
  });
});
