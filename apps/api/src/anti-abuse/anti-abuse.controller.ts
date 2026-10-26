import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { bookingCreateSchema, holdCreateSchema, idempotencyKeySchema } from '@reservas/shared';
import { Request } from 'express';
import { z } from 'zod';
import { AntiAbuseService } from './anti-abuse.service';

const requestSchema = z
  .object({
    action: z.enum(['BOOK', 'HOLD']),
    payload: z.record(z.string(), z.unknown()),
    idempotencyKey: idempotencyKeySchema.optional(),
  })
  .strict();
export const proofChallengeSchema = {
  type: 'object' as const,
  required: ['token', 'difficulty', 'expiresAt', 'algorithm', 'input'],
  properties: {
    token: { type: 'string' as const },
    difficulty: { type: 'integer' as const, minimum: 12, maximum: 22 },
    expiresAt: { type: 'string' as const, format: 'date-time' },
    algorithm: { type: 'string' as const, enum: ['SHA-256'] },
    input: { type: 'string' as const, enum: ['token:nonce'] },
  },
};
@ApiTags('anti-abuse')
@Controller('anti-abuse')
export class AntiAbuseController {
  constructor(@Inject(AntiAbuseService) private readonly antiAbuse: AntiAbuseService) {}
  @Post('challenge')
  @ApiOperation({
    summary:
      'Prueba de trabajo breve para solicitudes de invitados tras detectar abuso. No requiere servicios externos.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['action', 'payload'],
      additionalProperties: false,
      properties: {
        action: { type: 'string', enum: ['BOOK', 'HOLD'] },
        payload: { type: 'object', additionalProperties: true },
        idempotencyKey: { type: 'string', minLength: 16, maxLength: 128 },
      },
    },
  })
  @ApiCreatedResponse({ schema: proofChallengeSchema })
  issue(@Body() body: unknown, @Req() request: Request) {
    const input = requestSchema.parse(body);
    if (input.action === 'BOOK') {
      bookingCreateSchema.parse(input.payload);
      idempotencyKeySchema.parse(input.idempotencyKey);
    } else holdCreateSchema.parse(input.payload);
    return this.antiAbuse.issue(
      input.action,
      input.payload,
      request.ip ?? 'unknown',
      input.idempotencyKey,
    );
  }
}
