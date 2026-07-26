/* ============================================================
   BİNA SPRITE'LARI v2 — onaylanan "gerçekçi" sanat yönü.
   Her bina: kiremitli çatı, taş temel, sıva+ahşap çatkı, pencere
   (gündüz camlı / GECE IŞIKLI — iki varyant üretilir), kapı.
   Bir kez boyanır; ana döngü drawImage yapar.
   ============================================================ */
import type { BuildingType } from '../data/buildings';
import { SPRITE_SCALE } from './tiles';
import { painter, shade, stones, plaster, beam, shingles, windowPane, plankDoor } from './paint';
import type { RNG } from '../core/rng';

export interface BuildingSprite {
  cnv: HTMLCanvasElement;
  w: number;
  h: number;
  anchorY: number;
}

/** Dünyada görünen bina boyut çarpanı (kullanıcı isteği: binalar iri). */
export const BUILDING_SCALE = 1.28;

/** Değirmen kanat göbeği (sprite sol-üstünden, ölçeksiz dünya-px) —
    kanatlar sprite'a BAKE EDİLMEZ, sahnede dönerek çizilir. */
export const MILL_HUB = { x: 27, y: 37, r: 34 };

/** Baca ağzı konumları (sprite sol-üstünden, ölçeksiz dünya-px) —
    sahne bunlardan duman parçacığı yükseltir. */
export const SMOKE_VENTS: Partial<Record<BuildingType, { x: number; y: number }>> = {
  center: { x: 47.3, y: 22 },
  house: { x: 13.5, y: 12 },
  bakery: { x: 34.5, y: 11 },
};

type Painter = (c: CanvasRenderingContext2D, rng: RNG, R: (a: number, b: number) => number,
  W: number, H: number, base: number, night: boolean) => void;

const S = SPRITE_SCALE;

/* ---- ortak parçalar (S ölçekli koordinatlar) ---- */
function gableRoof(
  c: CanvasRenderingContext2D, rng: RNG,
  x: number, topY: number, w: number, rh: number, color: string, rows: number,
): void {
  // trapez ön yüz: üst kenar içeride (sırt), alt kenar saçak
  const inset = w * 0.16;
  shingles(c, rng, [
    [x + inset, topY],
    [x + w - inset, topY],
    [x + w + 4 * S, topY + rh],
    [x - 4 * S, topY + rh],
  ], color, rows);
}
function chimney(c: CanvasRenderingContext2D, rng: RNG, x: number, y: number, w: number, h: number): void {
  stones(c, rng, x, y, w, h, '#7a7264');
  c.fillStyle = '#4c463c';
  c.fillRect(x - 1.5 * S, y - 3 * S, w + 3 * S, 3.5 * S);
}
function flagPole(c: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  c.strokeStyle = '#3a2c1a';
  c.lineWidth = 1.8 * S;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 16 * S); c.stroke();
  const g = c.createLinearGradient(x, 0, x + 12 * S, 0);
  g.addColorStop(0, shade(color, 1.1));
  g.addColorStop(1, shade(color, 0.8));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x, y - 16 * S);
  c.quadraticCurveTo(x + 7 * S, y - 17.5 * S, x + 12 * S, y - 14.5 * S);
  c.quadraticCurveTo(x + 7 * S, y - 13 * S, x + 12 * S, y - 10 * S);
  c.quadraticCurveTo(x + 5 * S, y - 9 * S, x, y - 11 * S);
  c.closePath(); c.fill();
}
/* sıva + çatkı gövde */
function timberBody(
  c: CanvasRenderingContext2D, rng: RNG,
  x: number, y: number, w: number, h: number, plasterHex = '#e2d5b2',
): void {
  const baseH = Math.min(9 * S, h * 0.3);
  stones(c, rng, x, y + h - baseH, w, baseH, '#8a8578');
  plaster(c, rng, x, y, w, h - baseH, plasterHex, 1);
  beam(c, rng, x, y - 1 * S, w, 2.6 * S);
  beam(c, rng, x, y + (h - baseH) / 2 - 1 * S, w, 2.2 * S);
  beam(c, rng, x, y + h - baseH - 2.2 * S, w, 2.2 * S);
  for (const px of [x, x + w / 2 - 1.3 * S, x + w - 2.6 * S]) {
    beam(c, rng, px, y, 2.6 * S, h - baseH);
  }
  // çapraz payanda
  c.strokeStyle = shade('#5a4126', 1);
  c.lineWidth = 2.2 * S;
  c.beginPath();
  c.moveTo(x + 3 * S, y + h - baseH - 2 * S);
  c.lineTo(x + w / 2 - 2 * S, y + 2 * S);
  c.stroke();
}

/* ---- bina tarifleri ---- */
interface Def { w: number; h: number; paint: Painter; }

const DEFS: Record<BuildingType, Def> = {
  center: {
    w: 64, h: 78,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 56 * S, bx = (W2 - bw) / 2, bh = 26 * S, by = base - bh;
      timberBody(c, rng, bx, by, bw, bh);
      windowPane(c, bx + 6 * S, by + 4 * S, 8 * S, 9 * S, night);
      windowPane(c, bx + bw - 14 * S, by + 4 * S, 8 * S, 9 * S, night);
      plankDoor(c, bx + bw / 2 - 6 * S, base - 14 * S, 12 * S, 14 * S);
      gableRoof(c, rng, bx - 3 * S, by - 17 * S, bw + 6 * S, 17 * S, '#8a4a2c', 5);
      chimney(c, rng, bx + bw * 0.72, by - 24 * S, 6 * S, 10 * S);
      flagPole(c, bx + bw * 0.28, by - 17 * S, '#a8342a');
    },
  },
  house: {
    w: 44, h: 56,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 36 * S, bx = (W2 - bw) / 2, bh = 20 * S, by = base - bh;
      timberBody(c, rng, bx, by, bw, bh, '#ddd0ac');
      windowPane(c, bx + 5 * S, by + 4 * S, 7 * S, 8 * S, night);
      plankDoor(c, bx + bw - 14 * S, base - 12 * S, 9 * S, 12 * S);
      gableRoof(c, rng, bx - 2.5 * S, by - 13 * S, bw + 5 * S, 13 * S, '#96552f', 4);
      chimney(c, rng, bx + bw * 0.2, by - 18 * S, 4.5 * S, 7 * S);
    },
  },
  woodcutter: {
    w: 46, h: 46,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 32 * S, bx = 2 * S, bh = 18 * S, by = base - bh;
      // kütük duvar (yatay tomruklar)
      for (let i = 0; i < 6; i++) {
        const ly = by + (bh * i) / 6;
        beam(c, rng, bx, ly, bw, bh / 6 + 0.5 * S, i % 2 ? '#6d5434' : '#5f472a');
        c.fillStyle = '#c8a468';
        c.beginPath(); c.ellipse(bx + bw, ly + bh / 12, 1.6 * S, bh / 12, 0, 0, 7); c.fill();
      }
      windowPane(c, bx + 5 * S, by + 4 * S, 6 * S, 7 * S, night);
      plankDoor(c, bx + bw - 12 * S, base - 11 * S, 8 * S, 11 * S);
      gableRoof(c, rng, bx - 2 * S, by - 11 * S, bw + 4 * S, 11 * S, '#7a5434', 3);
      // yan tomruk yığını
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3 - i; j++) {
          const px = bx + bw + 2 * S + j * 2.4 * S + i * 1.2 * S;
          const py = base - 3 * S - i * 3 * S;
          c.fillStyle = '#6b4c28';
          c.beginPath(); c.arc(px, py, 2.2 * S, 0, 7); c.fill();
          c.fillStyle = '#c8a468';
          c.beginPath(); c.arc(px, py, 1.4 * S, 0, 7); c.fill();
          c.strokeStyle = '#8a6838'; c.lineWidth = 0.5 * S;
          c.beginPath(); c.arc(px, py, 0.7 * S, 0, 7); c.stroke();
        }
      }
      // duvara dayalı balta
      c.strokeStyle = '#6b5334'; c.lineWidth = 1.4 * S;
      c.beginPath(); c.moveTo(bx - 1 * S, base); c.lineTo(bx + 3 * S, base - 9 * S); c.stroke();
      c.fillStyle = '#9aa0a8';
      c.beginPath();
      c.moveTo(bx + 2.4 * S, base - 9 * S);
      c.lineTo(bx + 6 * S, base - 8 * S);
      c.lineTo(bx + 4 * S, base - 5.6 * S);
      c.closePath(); c.fill();
    },
  },
  quarry: {
    w: 52, h: 40,
    paint(c, rng, R, W2, H2, base, _night) {
      // alçak taş çevre + moloz
      stones(c, rng, 4 * S, base - 10 * S, 30 * S, 10 * S, '#8a8578');
      for (let i = 0; i < 9; i++) {
        const px = R(6, W2 / S - 6) * S, py = base - R(1, 7) * S, r = R(2, 5) * S;
        c.fillStyle = shade('#8a8578', R(0.7, 1.15));
        c.beginPath();
        c.moveTo(px - r, py);
        c.lineTo(px - r * 0.3, py - r * 0.9);
        c.lineTo(px + r * 0.7, py - r * 0.6);
        c.lineTo(px + r, py + r * 0.3);
        c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.beginPath();
        c.moveTo(px - r * 0.3, py - r * 0.9);
        c.lineTo(px + r * 0.7, py - r * 0.6);
        c.lineTo(px + r * 0.1, py - r * 0.2);
        c.closePath(); c.fill();
      }
      // vinç direği
      c.strokeStyle = '#5a4126'; c.lineWidth = 1.8 * S;
      c.beginPath(); c.moveTo(38 * S, base); c.lineTo(38 * S, base - 16 * S); c.lineTo(46 * S, base - 12 * S); c.stroke();
      c.strokeStyle = 'rgba(40,30,16,0.8)'; c.lineWidth = 0.7 * S;
      c.beginPath(); c.moveTo(46 * S, base - 12 * S); c.lineTo(46 * S, base - 5 * S); c.stroke();
    },
  },
  farm: {
    w: 56, h: 34,
    paint(c, rng, R, W2, H2, base, _night) {
      // sürülmüş tarla (perspektifli sıralar) + başak filizleri
      const fy = base - 22 * S;
      const g = c.createLinearGradient(0, fy, 0, base);
      g.addColorStop(0, '#7a5f3c');
      g.addColorStop(1, '#5f4a2c');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(10 * S, fy);
      c.lineTo(W2 - 10 * S, fy);
      c.lineTo(W2 - 2 * S, base);
      c.lineTo(2 * S, base);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(40,28,14,0.5)';
      c.lineWidth = 1.2 * S;
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        c.beginPath();
        c.moveTo((10 - 8 * t) * S, fy + (base - fy) * t);
        c.lineTo(W2 - (10 - 8 * t) * S, fy + (base - fy) * t);
        c.stroke();
      }
      for (let i = 0; i < 46; i++) {
        const t = rng();
        const px = (10 - 8 * t) * S + rng() * (W2 - (20 - 16 * t) * S);
        const py = fy + (base - fy) * t;
        c.strokeStyle = shade(rng() < 0.5 ? '#c8a850' : '#a8c860', R(0.85, 1.15));
        c.lineWidth = 0.9 * S;
        const hh = (2 + t * 3) * S;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + R(-1.4, 1.4) * S, py - hh);
        c.stroke();
      }
      // çit
      for (let fx = 4 * S; fx < W2 - 3 * S; fx += 9 * S) {
        c.fillStyle = '#5f4a2e';
        c.fillRect(fx, base - 7 * S, 1.8 * S, 7 * S);
      }
      c.strokeStyle = '#6d5433';
      c.lineWidth = 1.4 * S;
      c.beginPath(); c.moveTo(3 * S, base - 5.4 * S); c.lineTo(W2 - 3 * S, base - 4.6 * S); c.stroke();
    },
  },
  hunter: {
    w: 42, h: 46,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 30 * S, bx = (W2 - bw) / 2, bh = 17 * S, by = base - bh;
      // koyu ahşap kulübe
      for (let i = 0; i < 5; i++) {
        beam(c, rng, bx, by + (bh * i) / 5, bw, bh / 5 + 0.5 * S, i % 2 ? '#4f3a22' : '#443118');
      }
      plankDoor(c, bx + bw / 2 - 4.5 * S, base - 11 * S, 9 * S, 11 * S);
      windowPane(c, bx + 4 * S, by + 4 * S, 5.5 * S, 6 * S, night);
      gableRoof(c, rng, bx - 2 * S, by - 11 * S, bw + 4 * S, 11 * S, '#5c4426', 3);
      // kapı üstü boynuz
      c.strokeStyle = '#d8cfb8';
      c.lineWidth = 1.1 * S;
      const ax = bx + bw / 2, ay = by - 1.5 * S;
      for (const dir of [-1, 1]) {
        c.beginPath();
        c.moveTo(ax, ay);
        c.quadraticCurveTo(ax + dir * 4 * S, ay - 4 * S, ax + dir * 6 * S, ay - 2 * S);
        c.moveTo(ax + dir * 2.4 * S, ay - 2.4 * S);
        c.lineTo(ax + dir * 3.4 * S, ay - 4.4 * S);
        c.stroke();
      }
      // asılı post
      c.fillStyle = '#8a6a4a';
      c.beginPath();
      c.moveTo(bx + bw - 3 * S, by + 3 * S);
      c.quadraticCurveTo(bx + bw + 1 * S, by + 8 * S, bx + bw - 2 * S, by + 13 * S);
      c.quadraticCurveTo(bx + bw - 6 * S, by + 9 * S, bx + bw - 3 * S, by + 3 * S);
      c.closePath(); c.fill();
    },
  },
  mine: {
    w: 50, h: 44,
    paint(c, rng, R, W2, H2, base, _night) {
      // kaya höyüğü
      const cx = W2 / 2;
      const g = c.createLinearGradient(0, base - 30 * S, 0, base);
      g.addColorStop(0, shade('#8a8272', 1.1));
      g.addColorStop(1, shade('#63594f', 0.9));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(2 * S, base);
      c.quadraticCurveTo(6 * S, base - 24 * S, cx, base - 28 * S);
      c.quadraticCurveTo(W2 - 6 * S, base - 22 * S, W2 - 2 * S, base);
      c.closePath(); c.fill();
      // kaya dokusu
      for (let i = 0; i < 10; i++) {
        c.strokeStyle = 'rgba(30,26,20,0.35)';
        c.lineWidth = 0.8 * S;
        const px = R(6, W2 / S - 6) * S, py = base - R(4, 22) * S;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + R(-5, 5) * S, py + R(2, 6) * S);
        c.stroke();
      }
      // giriş (destek kirişli)
      c.fillStyle = '#14100c';
      c.beginPath();
      c.moveTo(cx - 8 * S, base);
      c.lineTo(cx - 6 * S, base - 13 * S);
      c.quadraticCurveTo(cx, base - 17 * S, cx + 6 * S, base - 13 * S);
      c.lineTo(cx + 8 * S, base);
      c.closePath(); c.fill();
      beam(c, rng, cx - 9 * S, base - 15 * S, 18 * S, 2.6 * S);
      beam(c, rng, cx - 9 * S, base - 13 * S, 2.6 * S, 13 * S);
      beam(c, rng, cx + 6.4 * S, base - 13 * S, 2.6 * S, 13 * S);
      // altın parıltıları
      for (let i = 0; i < 5; i++) {
        c.fillStyle = `rgba(255,215,80,${R(0.5, 0.95)})`;
        c.beginPath();
        c.arc(R(8, W2 / S - 8) * S, base - R(6, 20) * S, R(0.6, 1.2) * S, 0, 7);
        c.fill();
      }
      // maden arabası rayı
      c.strokeStyle = '#4a3826'; c.lineWidth = 0.9 * S;
      c.beginPath(); c.moveTo(cx - 4 * S, base); c.lineTo(cx - 3 * S, base - 8 * S); c.stroke();
      c.beginPath(); c.moveTo(cx + 4 * S, base); c.lineTo(cx + 3 * S, base - 8 * S); c.stroke();
    },
  },
  storehouse: {
    w: 56, h: 54,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 48 * S, bx = (W2 - bw) / 2, bh = 22 * S, by = base - bh;
      // geniş ambar: kalas duvar
      stones(c, rng, bx, base - 6 * S, bw, 6 * S, '#8a8578');
      for (let i = 0; i < 6; i++) {
        beam(c, rng, bx + (bw * i) / 6, by, bw / 6 + 0.5 * S, bh - 6 * S, i % 2 ? '#7a5f3c' : '#6d5334');
      }
      // büyük çift kapı
      plankDoor(c, bx + bw / 2 - 9 * S, base - 15 * S, 9 * S, 15 * S);
      plankDoor(c, bx + bw / 2, base - 15 * S, 9 * S, 15 * S);
      // çatı (geniş)
      gableRoof(c, rng, bx - 3 * S, by - 13 * S, bw + 6 * S, 13 * S, '#7d6a48', 4);
      // tahıl çuvalları
      for (const [ox, oy] of [[-4, 0], [3, 0], [0, -3]]) {
        const px = bx + 6 * S + ox * S, py = base - 2 * S + oy * S;
        c.fillStyle = shade('#c8b088', R(0.9, 1.05));
        c.beginPath(); c.ellipse(px, py, 3 * S, 3.6 * S, 0, 0, 7); c.fill();
        c.strokeStyle = '#8a744c'; c.lineWidth = 0.6 * S;
        c.beginPath(); c.moveTo(px - 2 * S, py - 3 * S); c.lineTo(px + 2 * S, py - 3 * S); c.stroke();
      }
      void night;
    },
  },
  academy: {
    w: 46, h: 74,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 30 * S, bx = (W2 - bw) / 2, bh = 40 * S, by = base - bh;
      stones(c, rng, bx, base - 9 * S, bw, 9 * S, '#8a8578');
      plaster(c, rng, bx, by, bw, bh - 9 * S, '#d8d2c2', 1);
      // kat kirişleri
      beam(c, rng, bx, by + (bh - 9 * S) / 2 - 1 * S, bw, 2 * S);
      // kemerli pencereler (2 kat)
      for (const wy of [by + 4 * S, by + (bh - 9 * S) / 2 + 3 * S]) {
        for (const wx of [bx + 4 * S, bx + bw - 11 * S]) {
          c.fillStyle = '#3a2c1a';
          c.beginPath();
          c.moveTo(wx - 1 * S, wy + 9 * S);
          c.lineTo(wx - 1 * S, wy + 2 * S);
          c.quadraticCurveTo(wx + 3.5 * S, wy - 2 * S, wx + 8 * S, wy + 2 * S);
          c.lineTo(wx + 8 * S, wy + 9 * S);
          c.closePath(); c.fill();
          windowPane(c, wx, wy + 1 * S, 7 * S, 8 * S, night);
        }
      }
      plankDoor(c, bx + bw / 2 - 4.5 * S, base - 12 * S, 9 * S, 12 * S);
      // arduvaz çatı (mavi-gri, sivri)
      gableRoof(c, rng, bx - 2.5 * S, by - 15 * S, bw + 5 * S, 15 * S, '#3f5a6e', 4);
      // tepe alemi (kitap/küre)
      c.fillStyle = '#c8a038';
      c.beginPath(); c.arc(W2 / 2, by - 17 * S, 1.8 * S, 0, 7); c.fill();
      c.strokeStyle = '#c8a038'; c.lineWidth = 0.8 * S;
      c.beginPath(); c.moveTo(W2 / 2, by - 15 * S); c.lineTo(W2 / 2, by - 12 * S); c.stroke();
    },
  },
  barracks: {
    w: 54, h: 58,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 44 * S, bx = (W2 - bw) / 2, bh = 26 * S, by = base - bh;
      stones(c, rng, bx, by, bw, bh, '#7d786c');
      // mazgallar
      for (let i = 0; i < 5; i++) {
        stones(c, rng, bx + i * (bw / 5) + 1 * S, by - 4.5 * S, bw / 5 - 2.5 * S, 4.5 * S, '#7d786c');
      }
      // dar pencere (ok yuvası)
      for (const wx of [bx + 8 * S, bx + bw - 10 * S]) {
        c.fillStyle = night ? '#e8a850' : '#1c1814';
        c.fillRect(wx, by + 6 * S, 2 * S, 7 * S);
      }
      // demir kapı
      c.fillStyle = '#3a3430';
      c.fillRect(bx + bw / 2 - 6 * S, base - 14 * S, 12 * S, 14 * S);
      c.strokeStyle = '#5f5a52'; c.lineWidth = 0.9 * S;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(bx + bw / 2 - 6 * S, base - 13 * S + i * 4.4 * S);
        c.lineTo(bx + bw / 2 + 6 * S, base - 13 * S + i * 4.4 * S);
        c.stroke();
      }
      // köşe kulesi
      stones(c, rng, bx + bw - 8 * S, by - 12 * S, 10 * S, 12 * S, '#6f6a5e');
      for (let i = 0; i < 3; i++) {
        stones(c, rng, bx + bw - 8 * S + i * 3.6 * S, by - 15 * S, 2.6 * S, 3 * S, '#6f6a5e');
      }
      flagPole(c, bx + 4 * S, by - 4 * S, '#7c2a1e');
      void R;
    },
  },
  wall: {
    w: 58, h: 36,
    paint(c, rng, R, W2, H2, base, _night) {
      const bw = 52 * S, bx = (W2 - bw) / 2, bh = 14 * S, by = base - bh;
      stones(c, rng, bx, by, bw, bh, '#9a9184');
      for (let i = 0; i < 6; i++) {
        stones(c, rng, bx + i * (bw / 6) + 1.2 * S, by - 4 * S, bw / 6 - 3 * S, 4 * S, '#9a9184');
      }
      // yürüyüş yolu gölgesi
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(bx, by, bw, 1.4 * S);
      void R;
    },
  },
  lumbermill: {
    w: 52, h: 50,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 34 * S, bx = 2 * S, bh = 19 * S, by = base - bh;
      timberBody(c, rng, bx, by, bw, bh, '#d5c7a2');
      windowPane(c, bx + 5 * S, by + 4 * S, 6 * S, 7 * S, night);
      gableRoof(c, rng, bx - 2 * S, by - 12 * S, bw + 4 * S, 12 * S, '#4a5a2c', 3);
      // testere çarkı
      const sx = bx + bw + 7 * S, sy = base - 8 * S;
      c.fillStyle = '#8a8f98';
      c.beginPath(); c.arc(sx, sy, 6.5 * S, 0, 7); c.fill();
      c.fillStyle = '#b8bdc4';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * 6.28;
        c.beginPath();
        c.moveTo(sx + Math.cos(a) * 6.5 * S, sy + Math.sin(a) * 6.5 * S);
        c.lineTo(sx + Math.cos(a + 0.2) * 8 * S, sy + Math.sin(a + 0.2) * 8 * S);
        c.lineTo(sx + Math.cos(a + 0.4) * 6.5 * S, sy + Math.sin(a + 0.4) * 6.5 * S);
        c.closePath(); c.fill();
      }
      c.fillStyle = '#4c4640';
      c.beginPath(); c.arc(sx, sy, 1.6 * S, 0, 7); c.fill();
      // kereste istifi
      for (let i = 0; i < 4; i++) {
        beam(c, rng, bx + 3 * S, base - 2.2 * S - i * 2 * S, 14 * S - i * 2 * S, 1.8 * S, '#c8a468');
      }
    },
  },
  mill: {
    w: 54, h: 92,
    paint(c, rng, R, W2, H2, base, night) {
      const cx = W2 / 2;
      const bw = 22 * S, bh = 46 * S, by = base - bh;
      // konik taş gövde
      c.save();
      c.beginPath();
      c.moveTo(cx - bw / 2 - 3 * S, base);
      c.lineTo(cx - bw / 2 + 2 * S, by);
      c.lineTo(cx + bw / 2 - 2 * S, by);
      c.lineTo(cx + bw / 2 + 3 * S, base);
      c.closePath();
      c.clip();
      stones(c, rng, cx - bw / 2 - 3 * S, by, bw + 6 * S, bh, '#8a8270');
      // sağ gölge
      const sg = c.createLinearGradient(cx, 0, cx + bw / 2 + 3 * S, 0);
      sg.addColorStop(0, 'rgba(0,0,0,0)');
      sg.addColorStop(1, 'rgba(20,16,10,0.35)');
      c.fillStyle = sg;
      c.fillRect(cx, by, bw / 2 + 3 * S, bh);
      c.restore();
      windowPane(c, cx - 3.5 * S, by + 12 * S, 7 * S, 8 * S, night);
      plankDoor(c, cx - 5 * S, base - 12 * S, 10 * S, 12 * S);
      // külah
      c.fillStyle = shade('#6a4026', 0.95);
      c.beginPath();
      c.moveTo(cx - bw / 2 - 1 * S, by + 1 * S);
      c.lineTo(cx, by - 10 * S);
      c.lineTo(cx + bw / 2 + 1 * S, by + 1 * S);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(30,16,8,0.5)'; c.lineWidth = S;
      c.stroke();
      // kanat göbeği — kanatların kendisi sahnede DÖNEREK çizilir (MILL_HUB)
      c.fillStyle = '#3f2f1c';
      c.beginPath(); c.arc(cx, by - 3 * S, 2.6 * S, 0, 7); c.fill();
    },
  },
  bakery: {
    w: 46, h: 56,
    paint(c, rng, R, W2, H2, base, night) {
      const bw = 34 * S, bx = 3 * S, bh = 19 * S, by = base - bh;
      timberBody(c, rng, bx, by, bw, bh, '#e0cba0');
      windowPane(c, bx + 4 * S, by + 4 * S, 7 * S, 8 * S, night);
      plankDoor(c, bx + bw - 13 * S, base - 12 * S, 9 * S, 12 * S);
      gableRoof(c, rng, bx - 2 * S, by - 12 * S, bw + 4 * S, 12 * S, '#83402a', 3);
      // BÜYÜK fırın bacası (taş)
      chimney(c, rng, bx + bw - 6 * S, by - 20 * S, 7 * S, 16 * S);
      // tabela: kraker/simit
      c.strokeStyle = '#5a4126'; c.lineWidth = 1 * S;
      c.beginPath(); c.moveTo(bx + 8 * S, by - 1 * S); c.lineTo(bx + 8 * S, by + 3 * S); c.stroke();
      c.fillStyle = '#d8a860';
      c.beginPath(); c.arc(bx + 8 * S, by + 5.5 * S, 2.8 * S, 0, 7); c.fill();
      c.fillStyle = shade('#d8a860', 0.6);
      c.beginPath(); c.arc(bx + 8 * S, by + 5.5 * S, 1.2 * S, 0, 7); c.fill();
    },
  },
};

/** Tüm bina sprite'larını üret; gündüz + gece varyantı. */
export function buildBuildingSprites(night: boolean): Map<BuildingType, BuildingSprite> {
  const out = new Map<BuildingType, BuildingSprite>();
  const types = Object.keys(DEFS) as BuildingType[];
  for (let ti = 0; ti < types.length; ti++) {
    const type = types[ti];
    const d = DEFS[type];
    const { rng, R } = painter(4000 + ti * 101 + (night ? 5555 : 0));
    const W2 = d.w * S;
    const H2 = d.h * S;
    const cnv = document.createElement('canvas');
    cnv.width = W2; cnv.height = H2;
    const c = cnv.getContext('2d')!;
    const base = H2 - 6 * S; // zemin çizgisi

    // zemin gölgesi (yumuşak)
    const g = c.createRadialGradient(W2 / 2, base + 1 * S, 2, W2 / 2, base + 1 * S, W2 * 0.42);
    g.addColorStop(0, 'rgba(0,0,0,0.34)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(W2 / 2, base + 1.4 * S, W2 * 0.42, 5 * S, 0, 0, 7); c.fill();

    d.paint(c, rng, R, W2, H2, base, night);

    const K = BUILDING_SCALE;
    out.set(type, { cnv, w: d.w * K, h: d.h * K, anchorY: (d.h - 6) * K });
  }
  return out;
}

/* ============================================================
   AI BAŞKENT KALESİ — taş burç (bayrak sahnede krallık rengiyle
   çizilir; direk ucu CAPITAL_FLAG'te).
   ============================================================ */
/** Bayrak direği ucu (sprite sol-üstünden, ölçeksiz dünya-px). */
export const CAPITAL_FLAG = { x: 22, y: 8 };

export function buildCapitalSprite(night: boolean): BuildingSprite {
  const w = 44, h = 72;
  const { rng } = painter(night ? 8899 : 8898);
  const W2 = w * S, H2 = h * S;
  const cnv = document.createElement('canvas');
  cnv.width = W2; cnv.height = H2;
  const c = cnv.getContext('2d')!;
  const base = H2 - 6 * S;

  // zemin gölgesi
  const g = c.createRadialGradient(W2 / 2, base + 1 * S, 2, W2 / 2, base + 1 * S, W2 * 0.42);
  g.addColorStop(0, 'rgba(0,0,0,0.34)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(W2 / 2, base + 1.4 * S, W2 * 0.42, 5 * S, 0, 0, 7); c.fill();

  const bw = 26 * S, bx = (W2 - bw) / 2, bh = 40 * S, by = base - bh;
  // taş burç gövdesi
  stones(c, rng, bx, by, bw, bh, '#7d766a');
  // sağ yüz gölgesi (hacim)
  const sg = c.createLinearGradient(W2 / 2, 0, bx + bw, 0);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(18,14,10,0.35)');
  c.fillStyle = sg;
  c.fillRect(W2 / 2, by, bw / 2, bh);
  // mazgal dişleri
  c.save();
  for (let i = 0; i < 3; i++) {
    const tx = bx - 1 * S + i * (bw + 2 * S) / 3 + 1 * S;
    stones(c, rng, tx, by - 5 * S, (bw - 4 * S) / 3, 5.5 * S, '#736c60');
  }
  c.restore();
  // ok mazgalları + pencere
  c.fillStyle = '#241c12';
  c.fillRect(W2 / 2 - 1.2 * S, by + 8 * S, 2.4 * S, 7 * S);
  c.fillRect(W2 / 2 - 1.2 * S, by + 20 * S, 2.4 * S, 7 * S);
  if (night) {
    c.fillStyle = '#ffca6a';
    c.fillRect(W2 / 2 - 0.8 * S, by + 8.5 * S, 1.6 * S, 6 * S);
  }
  // kapı (kemerli)
  c.fillStyle = '#2c2014';
  c.beginPath();
  c.moveTo(W2 / 2 - 5 * S, base);
  c.lineTo(W2 / 2 - 5 * S, base - 8 * S);
  c.arc(W2 / 2, base - 8 * S, 5 * S, Math.PI, 0);
  c.lineTo(W2 / 2 + 5 * S, base);
  c.closePath(); c.fill();
  // bayrak direği (bayrağın kendisi sahnede krallık rengiyle)
  c.strokeStyle = '#2c241c';
  c.lineWidth = 1.6 * S;
  c.beginPath();
  c.moveTo(CAPITAL_FLAG.x * S, by - 5 * S);
  c.lineTo(CAPITAL_FLAG.x * S, CAPITAL_FLAG.y * S);
  c.stroke();

  const K = BUILDING_SCALE;
  return { cnv, w: w * K, h: h * K, anchorY: (h - 6) * K };
}
