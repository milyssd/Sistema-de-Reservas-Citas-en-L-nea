import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '../src/auth/auth.schemas';
import { MemoryRateLimitStore } from '../src/common/rate-limit';

describe('Input and rate-limit policies', () => {
  it('accepts Bolivia mobile numbers and rejects extra authorization fields', () => {
    const body = {
      name: 'Ana Pérez',
      email: 'ana@example.test',
      password: 'PasswordSeguro123',
      phone: '+59170123456',
    };
    expect(registerSchema.safeParse(body).success).toBe(true);
    expect(registerSchema.safeParse({ ...body, role: 'OWNER' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...body, phone: '+17123456789' }).success).toBe(false);
    expect(loginSchema.parse({ email: 'ANA@example.test', password: 'anything' }).email).toBe(
      'ana@example.test',
    );
  });
  it('counts concurrent requests atomically in the development fallback', async () => {
    const store = new MemoryRateLimitStore();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.increment('same-client', 60000)),
    );
    expect(results.at(-1)?.count).toBe(20);
    expect((await store.increment('different-client', 60000)).count).toBe(1);
  });
});
