/* ============================================================
   KARO SPRITE ÜRETİMİ — her biyom × gölge kovası bir kez çizilir,
   ana döngü yalnızca drawImage yapar (performans ilkesi:
   "karolar path yerine hazır sprite ile çizilir").
   ============================================================ */
import { BIOMES, type BiomeId } from '../data/biomes';
import { TILE_W, TILE_H } from './camera';

/** Sprite iç çözünürlük çarpanı — 2.4x zoom'da bile keskin kalır. */
export const SPRITE_SCALE = 2;
/** Karo eteği (yan yüz) dünya-piksel derinliği; en derin komşu düşüşünü örter. */
export const SKIRT = 26;
/** Yükseklik gölgeleme kovası sayısı. */
export const SHADE_STEPS = 6;

export interface TileSprite {
  cnv: HTMLCanvasElement;
  /** drawImage boyutları (dünya-piksel, zoom'suz) */
  w: number;
  h: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeColor(hex: string, mult: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * mult)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Yükseklik (0..1) → gölge kovası (0..SHADE_STEPS-1). */
export function shadeBucket(h: number): number {
  return Math.max(0, Math.min(SHADE_STEPS - 1, Math.floor(h * SHADE_STEPS)));
}

/** Tüm biyom × gölge sprite'larını üretir. Anahtar: `${biome}:${bucket}`. */
export function buildTileSprites(): Map<string, TileSprite> {
  const out = new Map<string, TileSprite>();
  const S = SPRITE_SCALE;
  const w = TILE_W * S;
  const topH = TILE_H * S;
  const fullH = (TILE_H + SKIRT) * S;

  for (const id of Object.keys(BIOMES) as BiomeId[]) {
    const def = BIOMES[id];
    for (let bucket = 0; bucket < SHADE_STEPS; bucket++) {
      // yükseklik kovasına göre parlaklık: alçak %88, yüksek %112
      const mult = 0.88 + (bucket / (SHADE_STEPS - 1)) * 0.24;
      const cnv = document.createElement('canvas');
      cnv.width = w; cnv.height = fullH;
      const c = cnv.getContext('2d')!;

      const midX = w / 2, midY = topH / 2;

      // ---- etek (yan yüzler) ----
      // sol yüz
      c.fillStyle = shadeColor(def.side, mult * 0.9);
      c.beginPath();
      c.moveTo(0, midY);
      c.lineTo(midX, topH);
      c.lineTo(midX, fullH);
      c.lineTo(0, midY + SKIRT * S);
      c.closePath();
      c.fill();
      // sağ yüz (biraz daha aydınlık — ışık sol-üstten)
      c.fillStyle = shadeColor(def.side, mult * 1.04);
      c.beginPath();
      c.moveTo(w, midY);
      c.lineTo(midX, topH);
      c.lineTo(midX, fullH);
      c.lineTo(w, midY + SKIRT * S);
      c.closePath();
      c.fill();

      // ---- üst yüzey (elmas) ----
      c.fillStyle = shadeColor(def.top, mult);
      c.beginPath();
      c.moveTo(midX, 0);
      c.lineTo(w, midY);
      c.lineTo(midX, topH);
      c.lineTo(0, midY);
      c.closePath();
      c.fill();

      // üst-sol kenar ışığı + alt-sağ kenar gölgesi (çok hafif — ızgara hissi vermesin)
      c.strokeStyle = 'rgba(255,255,255,0.045)';
      c.lineWidth = S;
      c.beginPath();
      c.moveTo(0, midY);
      c.lineTo(midX, 0);
      c.lineTo(w, midY);
      c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.06)';
      c.beginPath();
      c.moveTo(w, midY);
      c.lineTo(midX, topH);
      c.lineTo(0, midY);
      c.stroke();

      out.set(`${id}:${bucket}`, { cnv, w: TILE_W, h: TILE_H + SKIRT });
    }
  }
  return out;
}
