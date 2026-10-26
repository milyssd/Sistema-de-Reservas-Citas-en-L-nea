import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { getConfig } from '../common/config';
import { PrismaService } from '../common/prisma.service';
import { RateLimitService } from '../common/rate-limit';
import {
  bindingHash,
  createProof,
  decodeProof,
  GuestAction,
  sha256,
  satisfiesProof,
} from './proof';

@Injectable()
export class AntiAbuseService {
  private readonly policy = z
    .object({
      GUEST_POW_AFTER: z.coerce.number().int().min(1).max(100).default(8),
      GUEST_POW_DIFFICULTY: z.coerce.number().int().min(12).max(22).default(16),
      GUEST_POW_TTL_SECONDS: z.coerce.number().int().min(30).max(300).default(120),
    })
    .parse(process.env);
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(RateLimitService) private readonly limiter: RateLimitService,
  ) {}

  async issue(action: GuestAction, payload: unknown, ip: string, idempotencyKey?: string) {
    const config = getConfig();
    await this.limiter.consume(
      `guest-proof:challenge:${config.BUSINESS_ID}:${sha256(ip)}`,
      12,
      5 * 60000,
    );
    let binding: string;
    try {
      binding = bindingHash(action, payload, idempotencyKey);
    } catch {
      throw new BadRequestException({
        code: 'INVALID_INPUT',
        message: 'El contenido de la solicitud es demasiado complejo.',
      });
    }
    return createProof(
      config.JWT_SECRET,
      config.BUSINESS_ID,
      ip,
      binding,
      this.policy.GUEST_POW_DIFFICULTY,
      this.policy.GUEST_POW_TTL_SECONDS,
    );
  }

  async assertGuest(
    request: Pick<Request, 'ip' | 'headers'> & { user?: unknown },
    action: GuestAction,
    payload: unknown,
    idempotencyKey?: string,
  ): Promise<void> {
    if (request.user) return;
    const ip = request.ip ?? 'unknown',
      config = getConfig();
    const attempts = await this.limiter.record(
      `guest-proof:attempt:${config.BUSINESS_ID}:${sha256(ip)}`,
      15 * 60000,
    );
    const token = request.headers['x-guest-challenge'],
      nonce = request.headers['x-guest-nonce'];
    if (token === undefined && nonce === undefined && attempts.count <= this.policy.GUEST_POW_AFTER)
      return;
    if (token === undefined && nonce === undefined) {
      const challenge = await this.issue(action, payload, ip, idempotencyKey);
      throw new ForbiddenException({
        code: 'GUEST_CHALLENGE_REQUIRED',
        message: 'Verificando tu solicitud. Esto toma unos segundos.',
        challenge,
      });
    }
    await this.limiter.consume(`guest-proof:verify:${config.BUSINESS_ID}:${sha256(ip)}`, 30, 60000);
    if (typeof token !== 'string' || typeof nonce !== 'string') throw this.invalid();
    await this.verifyAndConsume(token, nonce, action, payload, ip, idempotencyKey);
  }

  async verifyAndConsume(
    token: string,
    nonce: string,
    action: GuestAction,
    payload: unknown,
    ip: string,
    idempotencyKey?: string,
  ) {
    const config = getConfig(),
      claims = decodeProof(token, config.JWT_SECRET),
      now = Math.floor(Date.now() / 1000);
    if (
      !claims ||
      claims.businessId !== config.BUSINESS_ID ||
      claims.ipHash !== sha256(ip) ||
      claims.iat > now + 5 ||
      claims.exp - claims.iat > 300
    )
      throw this.invalid();
    if (claims.exp <= now)
      throw new ForbiddenException({
        code: 'GUEST_PROOF_EXPIRED',
        message: 'La verificación expiró. Intenta nuevamente.',
      });
    let binding: string;
    try {
      binding = bindingHash(action, payload, idempotencyKey);
    } catch {
      throw this.invalid();
    }
    if (claims.binding !== binding || !satisfiesProof(token, nonce, claims.difficulty))
      throw this.invalid();
    try {
      // A unique database record consumes the proof across all API replicas, including without Redis in dev.
      await this.db.idempotencyRecord.create({
        data: {
          businessId: config.BUSINESS_ID,
          scope: 'guest-proof',
          key: claims.jti,
          requestHash: claims.binding,
          response: { consumed: true },
          statusCode: 200,
          expiresAt: new Date(claims.exp * 1000),
        },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')
        throw new ForbiddenException({
          code: 'GUEST_PROOF_REPLAYED',
          message: 'Esta verificación ya fue utilizada. Intenta nuevamente.',
        });
      throw error;
    }
  }
  private invalid() {
    return new ForbiddenException({
      code: 'GUEST_PROOF_INVALID',
      message: 'La verificación no es válida para esta solicitud.',
    });
  }
}
