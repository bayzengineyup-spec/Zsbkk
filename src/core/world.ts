/* ============================================================
   CORE: Dünya üretimi (simülasyon çekirdeği)
   Prototipten birebir taşındı — deterministik: aynı tohum +
   aynı boyut → aynı dünya. DOM'a ve zamana dokunmaz.
   ============================================================ */
import { makeRNG } from './rng';
import { makeNoise, fbm } from './noise';
import { BIOMES, type BiomeId, type ResourceKind } from '../data/biomes';

/** Yükseklik + iklimden biyom seçimi (prototiple birebir aynı eşikler). */
export function pickBiome(h: number, temp: number, moist: number): BiomeId {
  if (h < 0.30) return 'deep_water';
  if (h < 0.38) return 'water';
  if (h < 0.42) return 'shore';
  if (h < 0.44) return temp > 0.6 ? 'beach' : 'shore';
  if (h > 0.90) return temp < 0.35 ? 'peak' : 'volcanic';
  if (h > 0.82) return 'mountain';
  if (h > 0.74) return 'rock';
  // düzlük / tepe bölgesi → iklim
  if (temp < 0.25) return h > 0.6 ? 'snow' : 'tundra';
  if (temp < 0.42) return moist > 0.5 ? 'taiga' : 'tundra';
  if (temp > 0.68) {
    if (moist < 0.40) return 'desert';
    if (moist < 0.60) return 'savanna';
    return 'forest';
  }
  // ılıman
  if (moist < 0.34) return 'savanna';
  if (moist > 0.70) return h < 0.5 ? 'swamp' : 'forest';
  if (moist > 0.54) return 'forest';
  return 'grass';
}

export class World {
  readonly W: number;
  readonly H: number;
  readonly seed: number;
  /** Karo başına biyom kimliği */
  readonly tiles: BiomeId[];
  /** Karo başına yükseklik 0..1 */
  readonly height: Float32Array;
  /** Karo başına serpiştirilmiş kaynak */
  readonly res: (ResourceKind | null)[];

  constructor(w: number, h: number, seed: number) {
    this.W = w; this.H = h; this.seed = seed;
    this.tiles = new Array<BiomeId>(w * h);
    this.height = new Float32Array(w * h);
    this.res = new Array<ResourceKind | null>(w * h);
    this.build();
  }

  private build(): void {
    const { W, H, seed } = this;
    const nH = makeNoise(seed * 7 + 11);
    const nT = makeNoise(seed * 13 + 3);
    const nM = makeNoise(seed * 29 + 101);
    const nWarp = makeNoise(seed * 17 + 5);
    const cx = W / 2, cy = H / 2, maxD = Math.hypot(cx, cy);
    const rng = makeRNG(seed * 91 + 7);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const nx = x / W, ny = y / H;
        // domain warp → daha organik kıyılar
        const wx = nx + (fbm(nWarp, nx * 3, ny * 3, 3, 2, 0.5) - 0.5) * 0.35;
        const wy = ny + (fbm(nWarp, nx * 3 + 9, ny * 3 + 9, 3, 2, 0.5) - 0.5) * 0.35;
        const base = fbm(nH, wx * 3.2, wy * 3.2, 6, 2.0, 0.55);
        // dağ vurgusu: ridged noise, yalnızca zaten yüksek yerlerde belirginleşir
        const ridge = 1 - Math.abs(fbm(nH, wx * 2.1 + 50, wy * 2.1 + 50, 4, 2, 0.5) * 2 - 1);
        const mountainMask = Math.max(0, base - 0.55) * 2.2;
        let h = base + ridge * ridge * mountainMask * 0.5;
        // ada maskesi: kenarlar denize insin
        const d = Math.hypot(x - cx, y - cy) / maxD;
        const island = 1 - Math.pow(d, 2.6);
        h = h * 0.68 + island * 0.40 - 0.10;
        h = Math.max(0, Math.min(1, h));

        let temp = fbm(nT, wx * 2.0, wy * 2.0, 4, 2, 0.5);
        temp = temp * 0.6 + (1 - Math.abs(ny - 0.5) * 2) * 0.4; // ekvator sıcak
        temp -= Math.max(0, h - 0.7) * 0.6;                      // yükseklerde soğuk
        temp = Math.max(0, Math.min(1, temp));

        const moist = fbm(nM, wx * 2.6 + 40, wy * 2.6 + 40, 5, 2, 0.5);
        const b = pickBiome(h, temp, moist);
        this.tiles[i] = b;
        this.height[i] = h;
        // kaynak serpiştirme (deterministik sırada!)
        const rdef = BIOMES[b].res;
        this.res[i] = rdef !== null && rng() < 0.10 ? rdef : null;
      }
    }
  }

  idx(x: number, y: number): number { return y * this.W + x; }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.W && y < this.H;
  }
}
