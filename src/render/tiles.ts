/* ============================================================
   KARO SPRITE ÜRETİMİ v2 — onaylanan "gerçekçi" sanat yönü.
   Her biyom × gölge kovası bir kez, zengin dokuyla boyanır
   (çim yaprakları, çiçekler, su çizgileri, kum dalgası, kaya
   çatlağı…); ana döngü yalnızca drawImage yapar.
   ============================================================ */
import { BIOMES, type BiomeId } from '../data/biomes';
import { TILE_W, TILE_H } from './camera';
import { painter, shade } from './paint';

export const SPRITE_SCALE = 2;
export const SKIRT = 26;
export const SHADE_STEPS = 6;

export interface TileSprite {
  cnv: HTMLCanvasElement;
  w: number;
  h: number;
}

export function shadeBucket(h: number): number {
  return Math.max(0, Math.min(SHADE_STEPS - 1, Math.floor(h * SHADE_STEPS)));
}

/* elmas içinde rastgele nokta (dünya-px, merkez 0,0) */
function inDiamond(R: (a: number, b: number) => number): [number, number] {
  // reddedilerek örnekleme
  for (let i = 0; i < 8; i++) {
    const x = R(-TILE_W / 2, TILE_W / 2);
    const y = R(-TILE_H / 2, TILE_H / 2);
    if (Math.abs(x) / (TILE_W / 2) + Math.abs(y) / (TILE_H / 2) <= 0.94) return [x, y];
  }
  return [0, 0];
}

export function buildTileSprites(): Map<string, TileSprite> {
  const out = new Map<string, TileSprite>();
  const S = SPRITE_SCALE;
  const w = TILE_W * S;
  const topH = TILE_H * S;
  const fullH = (TILE_H + SKIRT) * S;

  const biomeIds = Object.keys(BIOMES) as BiomeId[];
  for (let bi = 0; bi < biomeIds.length; bi++) {
    const id = biomeIds[bi];
    const def = BIOMES[id];
    for (let bucket = 0; bucket < SHADE_STEPS; bucket++) {
      const { rng, R } = painter(1000 + bi * 37 + bucket);
      const mult = 0.88 + (bucket / (SHADE_STEPS - 1)) * 0.24;
      const cnv = document.createElement('canvas');
      cnv.width = w; cnv.height = fullH;
      const c = cnv.getContext('2d')!;
      const midX = w / 2, midY = topH / 2;

      const diamondPath = () => {
        c.beginPath();
        c.moveTo(midX, 0);
        c.lineTo(w, midY);
        c.lineTo(midX, topH);
        c.lineTo(0, midY);
        c.closePath();
      };

      // ---- etek (yan yüzler) ----
      c.fillStyle = shade(def.side, mult * 0.82);
      c.beginPath();
      c.moveTo(0, midY); c.lineTo(midX, topH); c.lineTo(midX, fullH); c.lineTo(0, midY + SKIRT * S);
      c.closePath(); c.fill();
      c.fillStyle = shade(def.side, mult * 1.0);
      c.beginPath();
      c.moveTo(w, midY); c.lineTo(midX, topH); c.lineTo(midX, fullH); c.lineTo(w, midY + SKIRT * S);
      c.closePath(); c.fill();
      // etek katman çizgileri (toprak/taş hissi)
      c.strokeStyle = 'rgba(0,0,0,0.14)';
      c.lineWidth = S * 0.7;
      for (let i = 1; i <= 3; i++) {
        const oy = (SKIRT * S * i) / 4;
        c.beginPath();
        c.moveTo(0, midY + oy); c.lineTo(midX, topH + oy);
        c.lineTo(w, midY + oy);
        c.stroke();
      }

      // ---- üst yüzey: dikey degrade taban ----
      const g = c.createLinearGradient(0, 0, 0, topH);
      g.addColorStop(0, shade(def.top, mult * 1.06));
      g.addColorStop(1, shade(def.top, mult * 0.9));
      diamondPath();
      c.fillStyle = g;
      c.fill();

      // ---- biyoma özel detay (kırpılmış) ----
      c.save();
      diamondPath();
      c.clip();
      c.translate(midX, midY);

      const isGrass = id === 'grass' || id === 'savanna' || id === 'forest'
        || id === 'taiga' || id === 'swamp';
      const isWaterB = id === 'water' || id === 'deep_water';
      const isRock = id === 'rock' || id === 'mountain' || id === 'volcanic' || id === 'tundra';
      const isSand = id === 'beach' || id === 'shore' || id === 'desert';
      const isSnow = id === 'snow' || id === 'peak';

      if (isGrass) {
        // ton yamaları
        for (let i = 0; i < 7; i++) {
          const [px, py] = inDiamond(R);
          const r = R(8, 22) * S;
          const pg = c.createRadialGradient(px * S, py * S, 1, px * S, py * S, r);
          pg.addColorStop(0, shade(def.top, mult * R(0.85, 1.15)));
          pg.addColorStop(1, 'rgba(0,0,0,0)');
          c.globalAlpha = 0.5;
          c.fillStyle = pg;
          c.fillRect(px * S - r, py * S - r, r * 2, r * 2);
          c.globalAlpha = 1;
        }
        // tek tek çim yaprakları
        const blades = id === 'swamp' ? 60 : 90;
        for (let i = 0; i < blades; i++) {
          const [px, py] = inDiamond(R);
          const tone = R(0.7, 1.3);
          c.strokeStyle = shade(def.top, mult * tone);
          c.lineWidth = R(0.7, 1.4) * S;
          const hh = R(2.5, 6) * S, sway = R(-2, 2) * S;
          c.beginPath();
          c.moveTo(px * S, py * S);
          c.quadraticCurveTo(px * S + sway * 0.5, py * S - hh * 0.6, px * S + sway, py * S - hh);
          c.stroke();
        }
        // çiçek/mantar
        const fl = id === 'grass' ? 4 : id === 'savanna' ? 2 : 1;
        for (let i = 0; i < fl; i++) {
          const [px, py] = inDiamond(R);
          c.fillStyle = id === 'swamp' ? '#a8b060' : rng() < 0.5 ? '#e8e0c0' : '#d8b048';
          c.beginPath(); c.arc(px * S, py * S, R(1, 1.8) * S, 0, 7); c.fill();
        }
        // bataklıkta su birikintisi
        if (id === 'swamp') {
          for (let i = 0; i < 3; i++) {
            const [px, py] = inDiamond(R);
            c.fillStyle = 'rgba(40,60,55,0.5)';
            c.beginPath(); c.ellipse(px * S, py * S, R(5, 12) * S, R(2, 5) * S, 0, 0, 7); c.fill();
            c.strokeStyle = 'rgba(200,220,200,0.2)';
            c.lineWidth = S * 0.6;
            c.stroke();
          }
        }
      } else if (isWaterB) {
        // derinlik degradesi + yansıma çizgileri
        for (let i = 0; i < 16; i++) {
          const [px, py] = inDiamond(R);
          c.strokeStyle = `rgba(255,255,255,${R(0.04, 0.14)})`;
          c.lineWidth = R(0.8, 1.8) * S;
          const len = R(8, 26) * S;
          c.beginPath();
          c.moveTo(px * S - len / 2, py * S);
          c.lineTo(px * S + len / 2, py * S + R(-1, 1) * S);
          c.stroke();
        }
        // koyu derinlik lekeleri
        for (let i = 0; i < 4; i++) {
          const [px, py] = inDiamond(R);
          const r = R(8, 18) * S;
          const pg = c.createRadialGradient(px * S, py * S, 1, px * S, py * S, r);
          pg.addColorStop(0, 'rgba(6,18,30,0.35)');
          pg.addColorStop(1, 'rgba(6,18,30,0)');
          c.fillStyle = pg;
          c.fillRect(px * S - r, py * S - r, r * 2, r * 2);
        }
      } else if (isSand) {
        // kum dalgaları
        for (let i = 0; i < 9; i++) {
          const [px, py] = inDiamond(R);
          c.strokeStyle = shade(def.top, mult * R(0.82, 0.92));
          c.lineWidth = R(0.8, 1.4) * S;
          c.beginPath();
          c.moveTo(px * S - 12 * S, py * S);
          c.quadraticCurveTo(px * S, py * S - 3 * S, px * S + 12 * S, py * S);
          c.stroke();
        }
        // çakıl + kabuk
        for (let i = 0; i < 10; i++) {
          const [px, py] = inDiamond(R);
          c.fillStyle = shade(def.top, mult * R(0.75, 1.2));
          c.beginPath(); c.ellipse(px * S, py * S, R(0.8, 2) * S, R(0.6, 1.4) * S, R(0, 3), 0, 7); c.fill();
        }
      } else if (isRock) {
        // kaya parçaları (çok köşeli, ışık/gölge yüzlü)
        for (let i = 0; i < 7; i++) {
          const [px, py] = inDiamond(R);
          const r = R(3, 8) * S;
          c.fillStyle = shade(def.top, mult * R(0.7, 1.2));
          c.beginPath();
          c.moveTo(px * S - r, py * S);
          c.lineTo(px * S - r * 0.3, py * S - r * 0.8);
          c.lineTo(px * S + r * 0.7, py * S - r * 0.6);
          c.lineTo(px * S + r, py * S + r * 0.4);
          c.lineTo(px * S - r * 0.4, py * S + r * 0.5);
          c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.14)';
          c.beginPath();
          c.moveTo(px * S - r * 0.3, py * S - r * 0.8);
          c.lineTo(px * S + r * 0.7, py * S - r * 0.6);
          c.lineTo(px * S + r * 0.2, py * S - r * 0.2);
          c.closePath(); c.fill();
        }
        // çatlaklar
        c.strokeStyle = 'rgba(20,16,12,0.35)';
        c.lineWidth = S * 0.6;
        for (let i = 0; i < 4; i++) {
          let [px, py] = inDiamond(R);
          c.beginPath(); c.moveTo(px * S, py * S);
          for (let s2 = 0; s2 < 3; s2++) {
            px += R(-6, 6); py += R(-3, 3);
            c.lineTo(px * S, py * S);
          }
          c.stroke();
        }
        if (id === 'volcanic') {
          for (let i = 0; i < 3; i++) {
            const [px, py] = inDiamond(R);
            c.fillStyle = `rgba(220,80,30,${R(0.15, 0.4)})`;
            c.beginPath(); c.ellipse(px * S, py * S, R(2, 5) * S, R(0.8, 1.6) * S, R(0, 3), 0, 7); c.fill();
          }
        }
      } else if (isSnow) {
        // kar ışıltısı + mavi gölge oyukları
        for (let i = 0; i < 8; i++) {
          const [px, py] = inDiamond(R);
          c.fillStyle = 'rgba(170,195,220,0.3)';
          c.beginPath(); c.ellipse(px * S, py * S, R(3, 9) * S, R(1.5, 4) * S, R(0, 3), 0, 7); c.fill();
        }
        for (let i = 0; i < 20; i++) {
          const [px, py] = inDiamond(R);
          c.fillStyle = `rgba(255,255,255,${R(0.3, 0.9)})`;
          c.fillRect(px * S, py * S, S * 0.8, S * 0.8);
        }
      }
      c.restore();

      // kenar: çok hafif iç gölge (karo ayrımı doğal kalsın)
      diamondPath();
      c.strokeStyle = 'rgba(0,0,0,0.08)';
      c.lineWidth = S * 0.6;
      c.stroke();

      out.set(`${id}:${bucket}`, { cnv, w: TILE_W, h: TILE_H + SKIRT });
    }
  }
  return out;
}

/* ============================================================
   AĞAÇ SPRITE'LARI — orman/iğne orman karolarına dikilir.
   Onaylanan stil: dallı gövde + katmanlı yaprak kümeleri.
   ============================================================ */
export interface TreeSprite {
  cnv: HTMLCanvasElement;
  w: number;
  h: number;
  /** taban noktasının sprite içindeki y'si (dünya-px) */
  baseY: number;
}

export function buildTreeSprites(): TreeSprite[] {
  const S = SPRITE_SCALE;
  const variants: TreeSprite[] = [];
  const defs = [
    { kind: 'oak', crown: '#3f5e28', crown2: '#4c6c2e', h: 66, r: 26 },
    { kind: 'oak', crown: '#44632c', crown2: '#557a34', h: 56, r: 22 },
    { kind: 'pine', crown: '#2e4a30', crown2: '#3a5c3a', h: 70, r: 18 },
  ];
  for (let vi = 0; vi < defs.length; vi++) {
    const d = defs[vi];
    const { rng, R } = painter(7000 + vi * 13);
    const w = (d.r * 2 + 14) * S;
    const h = (d.h + 14) * S;
    const cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    const c = cnv.getContext('2d')!;
    const cx = w / 2, baseY = h - 6 * S;

    // gölge
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.ellipse(cx + 2 * S, baseY + 2 * S, d.r * 0.8 * S, 3.4 * S, 0, 0, 7); c.fill();

    if (d.kind === 'pine') {
      // gövde
      c.fillStyle = '#4c3820';
      c.fillRect(cx - 2 * S, baseY - 14 * S, 4 * S, 15 * S);
      // katmanlı çam
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1);
        const ly = baseY - 12 * S - t * (d.h - 22) * S;
        const lr = d.r * (1 - t * 0.62) * S;
        c.fillStyle = shade(i % 2 ? d.crown : d.crown2, R(0.9, 1.1));
        c.beginPath();
        c.moveTo(cx - lr, ly);
        c.lineTo(cx, ly - 14 * S * (1 - t * 0.3));
        c.lineTo(cx + lr, ly);
        c.closePath(); c.fill();
        // kar/ışık kenarı
        c.strokeStyle = 'rgba(255,255,255,0.08)';
        c.lineWidth = S;
        c.beginPath(); c.moveTo(cx - lr, ly); c.lineTo(cx, ly - 14 * S * (1 - t * 0.3)); c.stroke();
      }
    } else {
      // meşe gövdesi
      const tg = c.createLinearGradient(cx - 4 * S, 0, cx + 4 * S, 0);
      tg.addColorStop(0, '#57422a');
      tg.addColorStop(0.5, '#6d5434');
      tg.addColorStop(1, '#3f2f1c');
      c.fillStyle = tg;
      c.beginPath();
      c.moveTo(cx - 4.4 * S, baseY);
      c.quadraticCurveTo(cx - 2.6 * S, baseY - 12 * S, cx - 3.6 * S, baseY - 22 * S);
      c.lineTo(cx + 3 * S, baseY - 23 * S);
      c.quadraticCurveTo(cx + 2.4 * S, baseY - 11 * S, cx + 4.6 * S, baseY);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(30,20,10,0.5)';
      c.lineWidth = 0.7 * S;
      for (let i = 0; i < 3; i++) {
        const px = cx - 2.6 * S + i * 2.4 * S;
        c.beginPath();
        c.moveTo(px, baseY - R(0, 3) * S);
        c.quadraticCurveTo(px + R(-1, 1) * S, baseY - 12 * S, px + R(-0.8, 0.8) * S, baseY - 20 * S);
        c.stroke();
      }
      // dallar
      c.strokeStyle = '#4c3820';
      c.lineWidth = 2.2 * S;
      c.lineCap = 'round';
      for (const [dx, dy] of [[-12, -34], [11, -32], [-3, -38]]) {
        c.beginPath();
        c.moveTo(cx, baseY - 20 * S);
        c.quadraticCurveTo(cx + dx * 0.4 * S, baseY - 28 * S, cx + dx * S, baseY + dy * S);
        c.stroke();
      }
      // taç kümeleri
      const clusters: [number, number, number][] = [];
      for (let i = 0; i < 20; i++) {
        const a = rng() * 6.28, dd = Math.pow(rng(), 0.7);
        clusters.push([
          cx + Math.cos(a) * dd * d.r * 0.95 * S,
          baseY - (d.h - 26) * S + Math.sin(a) * dd * d.r * 0.6 * S,
          R(6, 12) * S,
        ]);
      }
      clusters.sort((p, q) => q[1] - p[1]);
      for (const [px, py, r] of clusters) {
        const depth = (py - (baseY - (d.h - 4) * S)) / (d.r * 1.2 * S);
        const side = (px - cx) / (d.r * S);
        const tone = Math.max(0.4, 1.25 - depth * 0.5 - side * 0.16);
        c.fillStyle = shade(rng() < 0.25 ? d.crown2 : d.crown, tone);
        c.beginPath();
        for (let k = 0; k < 8; k++) {
          const aa = (k / 8) * 6.28;
          const rr = r * R(0.8, 1.05);
          const lx = px + Math.cos(aa) * rr, ly = py + Math.sin(aa) * rr * 0.85;
          k === 0 ? c.moveTo(lx, ly) : c.lineTo(lx, ly);
        }
        c.closePath(); c.fill();
      }
      // güneş benekleri
      for (let i = 0; i < 16; i++) {
        const a = rng() * 6.28, dd = Math.pow(rng(), 0.6);
        c.fillStyle = `rgba(210,235,150,${R(0.06, 0.2)})`;
        c.beginPath();
        c.arc(
          cx + Math.cos(a) * dd * d.r * 0.8 * S - 4 * S,
          baseY - (d.h - 22) * S + Math.sin(a) * dd * d.r * 0.5 * S,
          R(1, 2.6) * S, 0, 7,
        );
        c.fill();
      }
    }
    variants.push({ cnv, w: w / S, h: h / S, baseY: baseY / S });
  }
  return variants;
}
