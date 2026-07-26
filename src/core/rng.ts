/* ============================================================
   DETERMİNİSTİK RASTGELE (mulberry32 türevi)
   Prototipten birebir taşındı — çok oyunculu (lockstep) için
   simülasyonun TEK rastgele kaynağı budur. Math.random() yasak.
   ============================================================ */

export type RNG = () => number;

/** Tohumdan deterministik [0,1) üreteci. Aynı tohum → aynı dizi. */
export function makeRNG(seed: number): RNG {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min,max) aralığında deterministik tam sayı. */
export function rngInt(rng: RNG, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min));
}

/** Diziden deterministik eleman seçimi. */
export function rngPick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
