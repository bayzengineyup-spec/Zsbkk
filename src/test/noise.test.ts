import { describe, it, expect } from 'vitest';
import { makeNoise, fbm } from '../core/noise';

describe('makeNoise (değer gürültüsü)', () => {
  it('aynı tohum aynı alanı üretir', () => {
    const a = makeNoise(777);
    const b = makeNoise(777);
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++)
        expect(a(x * 0.13, y * 0.17)).toBe(b(x * 0.13, y * 0.17));
  });

  it('çıktılar 0..1 aralığındadır', () => {
    const n = makeNoise(31337);
    for (let i = 0; i < 500; i++) {
      const v = n(i * 0.37, i * 0.11);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('süreklidir: komşu noktalar arasında sıçrama yoktur', () => {
    const n = makeNoise(5);
    for (let i = 0; i < 200; i++) {
      const x = i * 0.31, y = i * 0.07;
      const d = Math.abs(n(x, y) - n(x + 0.01, y));
      expect(d).toBeLessThan(0.05);
    }
  });

  it('fbm deterministik ve 0..1 aralığındadır', () => {
    const n = makeNoise(88);
    for (let i = 0; i < 200; i++) {
      const v = fbm(n, i * 0.21, i * 0.13, 6, 2, 0.55);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(fbm(n, i * 0.21, i * 0.13, 6, 2, 0.55)).toBe(v);
    }
  });
});
