import { describe, it, expect } from 'vitest';
import { hmacSign, hmacVerify, stableStringify } from './crypto.js';

describe('crypto', () => {
  it('signs and verifies progress payload', async () => {
    const data = { unlockedLevel: 3, levelBestScores: { 1: 40, 2: 55 } };
    const payload = stableStringify(data);
    const sig = await hmacSign(payload, 'test-secret');
    expect(await hmacVerify(payload, sig, 'test-secret')).toBe(true);
    expect(await hmacVerify(payload, sig, 'wrong-secret')).toBe(false);
  });

  it('stableStringify is order-independent', () => {
    const a = stableStringify({ b: 2, a: { z: 1, y: 2 } });
    const b = stableStringify({ a: { y: 2, z: 1 }, b: 2 });
    expect(a).toBe(b);
  });
});
