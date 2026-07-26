import { describe, it, expect } from 'vitest';
import { makeRNG } from '../core/rng';

describe('makeRNG (deterministik rastgele)', () => {
  it('aynı tohum aynı diziyi üretir', () => {
    const a = makeRNG(12345);
    const b = makeRNG(12345);
    for (let i = 0; i < 1000; i++) expect(a()).toBe(b());
  });

  it('farklı tohumlar farklı dizi üretir', () => {
    const a = makeRNG(1);
    const b = makeRNG(2);
    let same = 0;
    for (let i = 0; i < 100; i++) if (a() === b()) same++;
    expect(same).toBeLessThan(5);
  });

  it('çıktılar [0,1) aralığındadır', () => {
    const r = makeRNG(999);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('dağılım kabaca düzgündür', () => {
    const r = makeRNG(42);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) sum += r();
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });
});
