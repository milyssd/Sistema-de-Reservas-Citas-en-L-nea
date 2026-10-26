import { createHash } from 'node:crypto';
import Redis from 'ioredis';

export interface AvailabilityCache {
  get<T>(businessId: string, query: unknown): Promise<T | null>;
  set(businessId: string, query: unknown, value: unknown): Promise<void>;
  invalidate(businessId: string): Promise<void>;
  close(): Promise<void>;
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const TTL_SECONDS = 5;

export class MemoryAvailabilityCache implements AvailabilityCache {
  private readonly entries = new Map<string, { value: unknown; expiresAt: number }>();
  async get<T>(businessId: string, query: unknown): Promise<T | null> {
    const key = `${businessId}:${digest(query)}`;
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }
  async set(businessId: string, query: unknown, value: unknown) {
    if (this.entries.size >= 256) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(`${businessId}:${digest(query)}`, {
      value,
      expiresAt: Date.now() + TTL_SECONDS * 1_000,
    });
  }
  async invalidate(businessId: string) {
    for (const key of this.entries.keys())
      if (key.startsWith(`${businessId}:`)) this.entries.delete(key);
  }
  async close() {
    this.entries.clear();
  }
}

export class RedisAvailabilityCache implements AvailabilityCache {
  private readonly redis: Redis;
  constructor(url: string) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2_000,
    });
    this.redis.on('error', () => {
      /* Cache is optional; bookings always recheck the database under resource locks. */
    });
    void this.redis.connect().catch(() => undefined);
  }
  private generation(businessId: string) {
    return `availability:generation:${businessId}`;
  }
  async get<T>(businessId: string, query: unknown): Promise<T | null> {
    try {
      const generation = (await this.redis.get(this.generation(businessId))) ?? '0';
      const value = await this.redis.get(
        `availability:${businessId}:${generation}:${digest(query)}`,
      );
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }
  async set(businessId: string, query: unknown, value: unknown) {
    try {
      const generation = (await this.redis.get(this.generation(businessId))) ?? '0';
      await this.redis.set(
        `availability:${businessId}:${generation}:${digest(query)}`,
        JSON.stringify(value),
        'EX',
        TTL_SECONDS,
      );
    } catch {
      /* Readiness and writes do not depend on this optional optimization. */
    }
  }
  async invalidate(businessId: string) {
    try {
      await this.redis.incr(this.generation(businessId));
    } catch {
      /* Cached results expire after five seconds. */
    }
  }
  async close() {
    this.redis.disconnect();
  }
}

export function createAvailabilityCache(): AvailabilityCache {
  return process.env.REDIS_URL
    ? new RedisAvailabilityCache(process.env.REDIS_URL)
    : new MemoryAvailabilityCache();
}
