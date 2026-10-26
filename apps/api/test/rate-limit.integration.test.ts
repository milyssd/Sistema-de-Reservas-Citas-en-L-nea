import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { RedisRateLimitStore } from '../src/common/rate-limit';
const describeRedis = process.env.REDIS_URL ? describe : describe.skip;
describeRedis('Shared Redis rate limiting', () => {
  it('shares atomic counters between independent API instances', async () => {
    const first = new RedisRateLimitStore(process.env.REDIS_URL!);
    const second = new RedisRateLimitStore(process.env.REDIS_URL!);
    try {
      const key = `integration:${randomUUID()}`;
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, index) => (index % 2 ? first : second).increment(key, 1000)),
      );
      expect(results.map((result) => result.count).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 20 }, (_, index) => index + 1),
      );
      await first.ready();
      await second.ready();
    } finally {
      await first.close();
      await second.close();
    }
  });
});
