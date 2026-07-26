/* ============================================================
   DEĞER GÜRÜLTÜSÜ (Perlin benzeri, kütüphanesiz)
   Prototipten birebir taşındı — dünya üretiminin temeli.
   Deterministiktir: aynı tohum → aynı gürültü alanı.
   ============================================================ */
import { makeRNG } from './rng';

export type Noise2D = (x: number, y: number) => number;

/** Tohumdan 2B gürültü fonksiyonu üretir; çıktı 0..1 aralığındadır. */
export function makeNoise(seed: number): Noise2D {
  const rng = makeRNG(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  function grad(h: number, x: number, y: number): number {
    switch (h & 3) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      default: return -x - y;
    }
  }

  return function (x: number, y: number): number {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    const r = lerp(
      lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
      lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u),
      v,
    );
    return (r + 1) * 0.5; // 0..1
  };
}

/** Kesirli Brown hareketi: çok oktavlı gürültü (0..1). */
export function fbm(
  noise: Noise2D, x: number, y: number,
  oct: number, lac: number, gain: number,
): number {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lac;
  }
  return sum / norm;
}
