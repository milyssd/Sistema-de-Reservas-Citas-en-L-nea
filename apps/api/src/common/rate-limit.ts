import {
  HttpException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import Redis from 'ioredis';

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; reset: number }>;
  close(): Promise<void>;
  ready(): Promise<void>;
}
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; reset: number }>();
  async increment(key: string, windowMs: number) {
    const now = Date.now();
    if (this.entries.size > 10000)
      for (const [entryKey, value] of this.entries)
        if (value.reset <= now) this.entries.delete(entryKey);
    let entry = this.entries.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      this.entries.set(key, entry);
    }
    entry.count += 1;
    return entry;
  }
  async close() {}
  async ready() {}
}
export class RedisRateLimitStore implements RateLimitStore {
  private readonly redis: Redis;
  private connecting?: Promise<void>;
  constructor(
    url: string,
    private readonly prefix = 'reservas:rate',
  ) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    this.redis.on('error', () => {
      /* Requests fail closed; no credentials are logged by the driver. */
    });
  }
  private async connected() {
    if (this.redis.status === 'ready') return;
    this.connecting ??= this.redis.connect();
    await this.connecting;
  }
  async increment(key: string, windowMs: number) {
    await this.connected();
    const result = (await this.redis.eval(
      "local value = redis.call('INCR', KEYS[1]); if value == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return {value, redis.call('PTTL', KEYS[1])}",
      1,
      `${this.prefix}:${key}`,
      windowMs,
    )) as [number, number];
    return { count: result[0], reset: Date.now() + result[1] };
  }
  async close() {
    this.redis.disconnect();
  }
  async ready() {
    await this.connected();
    await this.redis.ping();
  }
}
@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly store: RateLimitStore;
  constructor() {
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL)
      throw new Error('REDIS_URL is required in production for shared rate limiting.');
    this.store = process.env.REDIS_URL
      ? new RedisRateLimitStore(
          process.env.REDIS_URL,
          process.env.RATE_LIMIT_NAMESPACE ?? 'reservas:rate',
        )
      : new MemoryRateLimitStore();
  }
  async record(key: string, windowMs: number) {
    try {
      return await this.store.increment(key, windowMs);
    } catch {
      throw new ServiceUnavailableException({
        code: 'LIMITER_UNAVAILABLE',
        message: 'Servicio temporalmente no disponible.',
      });
    }
  }
  async consume(key: string, maximum: number, windowMs: number, response?: Response) {
    const entry = await this.record(key, windowMs);
    response?.setHeader('RateLimit-Limit', maximum);
    response?.setHeader('RateLimit-Remaining', Math.max(0, maximum - entry.count));
    response?.setHeader('RateLimit-Reset', Math.ceil(entry.reset / 1000));
    if (entry.count > maximum) {
      response?.setHeader('Retry-After', Math.max(1, Math.ceil((entry.reset - Date.now()) / 1000)));
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Espera e inténtalo nuevamente.' },
        429,
      );
    }
  }
  async request(
    request: Request,
    response: Response,
    action: string,
    maximum: number,
    windowMs = 60000,
  ) {
    await this.consume(`${action}:ip:${request.ip}`, maximum, windowMs, response);
    const user = (request as Request & { user?: { id: string } }).user;
    if (user) await this.consume(`${action}:user:${user.id}`, maximum, windowMs, response);
  }
  async ready() {
    await this.store.ready();
  }
  async onModuleDestroy() {
    await this.store.close();
  }
}
