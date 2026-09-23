import { describe, expect, it } from 'vitest';
import { solvePow, verifyPow } from '../src/pow.js';

// Shared with lambdas/developer/key-api/src/trial.ts (sha256-leading-zero-bits).
const VECTOR = { token: 'sw-pow-vector-v1', bits: 12, solution: '10961' };

describe('pow', () => {
  it('accepts the shared key-api vector', () => {
    expect(verifyPow(VECTOR.token, VECTOR.solution, VECTOR.bits)).toBe(true);
  });

  it('rejects a non-numeric solution', () => {
    expect(verifyPow(VECTOR.token, 'nope', VECTOR.bits)).toBe(false);
  });

  it('solvePow finds the shared vector solution', () => {
    expect(solvePow(VECTOR.token, VECTOR.bits)).toBe(VECTOR.solution);
  });
});
