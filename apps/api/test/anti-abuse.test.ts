import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  bindingHash,
  canonicalJson,
  createProof,
  decodeProof,
  satisfiesProof,
} from '../src/anti-abuse/proof';

const secret = 'unit-test-only-signing-key-not-a-real-secret';
const business = '11111111-1111-4111-8111-111111111111';
function solve(token: string, difficulty: number) {
  for (let nonce = 0; nonce < 2_000_000; nonce++) {
    const digest = createHash('sha256').update(`${token}:${nonce}`).digest();
    if (digest.readUInt32BE(0) >>> (32 - difficulty) === 0) return String(nonce);
  }
  throw new Error('No proof found within test budget');
}
describe('Guest proof cryptographic contract', () => {
  it('binds object semantics independently of key ordering, preserving array order', () => {
    expect(canonicalJson({ z: 2, a: { b: 1, a: 0 } })).toBe(
      canonicalJson({ a: { a: 0, b: 1 }, z: 2 }),
    );
    expect(bindingHash('HOLD', { ids: ['a', 'b'] })).not.toBe(
      bindingHash('HOLD', { ids: ['b', 'a'] }),
    );
    expect(bindingHash('BOOK', { amount: 1 }, 'first')).not.toBe(
      bindingHash('BOOK', { amount: 1 }, 'second'),
    );
    expect(() => canonicalJson({ unsupported: undefined })).toThrow();
  });
  it('authenticates signed claims and rejects alternate secrets or modified claims', () => {
    const challenge = createProof(
      secret,
      business,
      '203.0.113.1',
      bindingHash('HOLD', {}),
      12,
      120,
    );
    expect(decodeProof(challenge.token, secret)?.businessId).toBe(business);
    expect(decodeProof(challenge.token, 'different-secret')).toBeNull();
    const [payload, signature] = challenge.token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    claims.difficulty = 0;
    expect(
      decodeProof(
        `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}`,
        secret,
      ),
    ).toBeNull();
  });
  it('accepts the documented SHA256 zero-bit proof and rejects noncanonical nonces', () => {
    const challenge = createProof(
      secret,
      business,
      '203.0.113.2',
      bindingHash('HOLD', {}),
      12,
      120,
    );
    const nonce = solve(challenge.token, challenge.difficulty);
    expect(satisfiesProof(challenge.token, nonce, 12)).toBe(true);
    for (const invalid of ['-1', '01', '1e3', '', '9'.repeat(21)])
      expect(satisfiesProof(challenge.token, invalid, 12)).toBe(false);
  });
});
