import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export type GuestAction = 'BOOK' | 'HOLD';
export type ProofChallenge = {
  token: string;
  difficulty: number;
  expiresAt: string;
  algorithm: 'SHA-256';
  input: 'token:nonce';
};
export const claimsSchema = z
  .object({
    v: z.literal(1),
    jti: z.string().uuid(),
    businessId: z.string().uuid(),
    ipHash: z.string().regex(/^[a-f0-9]{64}$/),
    binding: z.string().regex(/^[a-f0-9]{64}$/),
    difficulty: z.number().int().min(12).max(22),
    iat: z.number().int(),
    exp: z.number().int(),
  })
  .strict();
export type ProofClaims = z.infer<typeof claimsSchema>;
export const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/** JSON only, deterministic key order; arrays retain their semantic ordering. */
export function canonicalJson(value: unknown): string {
  let visited = 0;
  const normalize = (entry: unknown, depth: number): unknown => {
    if (++visited > 2000 || depth > 16) throw new Error('PAYLOAD_TOO_COMPLEX');
    if (entry === null || typeof entry === 'string' || typeof entry === 'boolean') return entry;
    if (typeof entry === 'number' && Number.isFinite(entry)) return entry;
    if (Array.isArray(entry)) return entry.map((item) => normalize(item, depth + 1));
    if (
      typeof entry === 'object' &&
      entry !== null &&
      Object.getPrototypeOf(entry) === Object.prototype
    ) {
      return Object.fromEntries(
        Object.keys(entry)
          .sort()
          .map((key) => [key, normalize((entry as Record<string, unknown>)[key], depth + 1)]),
      );
    }
    throw new Error('PAYLOAD_NOT_JSON');
  };
  return JSON.stringify(normalize(value, 0));
}
export function bindingHash(action: GuestAction, payload: unknown, idempotencyKey?: string) {
  return sha256(canonicalJson({ action, payload, idempotencyKey: idempotencyKey ?? null }));
}
function signature(encoded: string, secret: string) {
  const scopedKey = createHmac('sha256', secret).update('reservas:guest-proof:v1').digest();
  return createHmac('sha256', scopedKey).update(encoded).digest();
}
export function signProof(claims: ProofClaims, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${encoded}.${signature(encoded, secret).toString('base64url')}`;
}
export function decodeProof(token: string, secret: string): ProofClaims | null {
  if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [encoded, provided] = token.split('.');
  const expected = signature(encoded, secret),
    actual = Buffer.from(provided, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    return claimsSchema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
  } catch {
    return null;
  }
}
export function satisfiesProof(token: string, nonce: string, difficulty: number): boolean {
  if (!/^(0|[1-9]\d{0,19})$/.test(nonce)) return false;
  const digest = createHash('sha256').update(`${token}:${nonce}`, 'utf8').digest();
  const whole = Math.floor(difficulty / 8),
    remaining = difficulty % 8;
  for (let index = 0; index < whole; index++) if (digest[index] !== 0) return false;
  return remaining === 0 || (digest[whole] & (0xff << (8 - remaining))) === 0;
}
export function createProof(
  secret: string,
  businessId: string,
  ip: string,
  binding: string,
  difficulty: number,
  ttlSeconds: number,
): ProofChallenge {
  const iat = Math.floor(Date.now() / 1000),
    exp = iat + ttlSeconds;
  const token = signProof(
    { v: 1, jti: randomUUID(), businessId, ipHash: sha256(ip), binding, difficulty, iat, exp },
    secret,
  );
  return {
    token,
    difficulty,
    expiresAt: new Date(exp * 1000).toISOString(),
    algorithm: 'SHA-256',
    input: 'token:nonce',
  };
}
