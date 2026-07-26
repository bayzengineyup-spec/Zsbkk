/* ============================================================
   BİNA SPRITE'LARI — YER TUTUCU prosedürel izometrik kutular.
   NOT: Gerçek dokular Faz 2'de her bina için AYRI AYRI üretilecek
   (docs/02-GRAFIK-SANAT). Buradaki amaç: sistemlerin çalışması ve
   binaların birbirinden net ayırt edilmesi.
   ============================================================ */
import type { BuildingType } from '../data/buildings';
import { TILE_W, TILE_H } from './camera';
import { SPRITE_SCALE } from './tiles';

export interface BuildingSprite {
  cnv: HTMLCanvasElement;
  /** çizim boyutları (dünya-piksel) */
  w: number;
  h: number;
  /** sprite içinde karo merkezinin y konumu (dünya-piksel) */
  anchorY: number;
}

interface Style {
  /** taban genişliği (dünya-piksel, karo içi) */
  fw: number;
  /** duvar yüksekliği */
  wall: number;
  /** çatı yüksekliği (0 = düz dam) */
  roof: number;
  wallC: string;
  roofC: string;
  /** düz alan (tarla gibi) — kutu yerine desenli zemin */
  flat?: boolean;
  /** bayrak direği (merkez) */
  banner?: boolean;
}

const STYLES: Record<BuildingType, Style> = {
  center:     { fw: 52, wall: 22, roof: 12, wallC: '#c9b28a', roofC: '#d9a441', banner: true },
  house:      { fw: 36, wall: 12, roof: 10, wallC: '#b09468', roofC: '#8a4a30' },
  woodcutter: { fw: 38, wall: 11, roof: 8,  wallC: '#8a6a42', roofC: '#5f4426' },
  quarry:     { fw: 44, wall: 8,  roof: 0,  wallC: '#8a8175', roofC: '#a29a8c' },
  farm:       { fw: 54, wall: 0,  roof: 0,  wallC: '#7a5a34', roofC: '#96b850', flat: true },
  hunter:     { fw: 36, wall: 11, roof: 9,  wallC: '#6f5638', roofC: '#3f4a22' },
  mine:       { fw: 42, wall: 12, roof: 0,  wallC: '#63594f', roofC: '#7a7064' },
  storehouse: { fw: 50, wall: 14, roof: 8,  wallC: '#c2a878', roofC: '#7d6a48' },
  academy:    { fw: 46, wall: 24, roof: 12, wallC: '#d8d2c2', roofC: '#3f6b8a' },
  barracks:   { fw: 48, wall: 16, roof: 6,  wallC: '#7d5a4a', roofC: '#5a3a30' },
  wall:       { fw: 56, wall: 14, roof: 0,  wallC: '#9a9184', roofC: '#b5ada0' },
};

function shade(hex: string, mult: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * mult)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Tüm bina sprite'larını üretir (bir kez). */
export function buildBuildingSprites(): Map<BuildingType, BuildingSprite> {
  const out = new Map<BuildingType, BuildingSprite>();
  const S = SPRITE_SCALE;

  for (const type of Object.keys(STYLES) as BuildingType[]) {
    const st = STYLES[type];
    const fw = st.fw;                       // taban elmas genişliği (dünya-px)
    const fh = fw / 2;                      // izometrik: yükseklik = genişlik/2
    const totalH = fh + st.wall + st.roof + 14; // pay (bayrak vs.)
    const W = fw * S, H = totalH * S;
    const cnv = document.createElement('canvas');
    cnv.width = W; cnv.height = H;
    const c = cnv.getContext('2d')!;
    const cx = W / 2;
    const baseY = H - (fh / 2) * S;         // taban elmasının merkezi
    const anchorY = totalH - fh / 2;        // karo merkezi (dünya-px, üstten)

    const dw = (fw / 2) * S, dh = (fh / 2) * S; // elmas yarıları

    if (st.flat) {
      // ---- düz alan (tarla): sürülmüş toprak + filiz sıraları ----
      c.fillStyle = st.wallC;
      c.beginPath();
      c.moveTo(cx, baseY - dh); c.lineTo(cx + dw, baseY);
      c.lineTo(cx, baseY + dh); c.lineTo(cx - dw, baseY);
      c.closePath(); c.fill();
      // saban izleri (izometrik çizgiler)
      c.strokeStyle = shade(st.wallC, 0.8);
      c.lineWidth = 1.5 * S;
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        c.beginPath();
        c.moveTo(cx - dw + dw * t, baseY - dh * t);
        c.lineTo(cx + dw * (1 - t), baseY + dh * t);
        c.stroke();
      }
      // filizler
      c.fillStyle = '#a8c860';
      for (let i = 0; i < 10; i++) {
        const fx = cx + ((i * 37) % 23 - 11) / 16 * dw;
        const fy = baseY + ((i * 53) % 17 - 8) / 16 * dh;
        c.fillRect(fx, fy - 2 * S, 1.6 * S, 2.6 * S);
      }
    } else {
      const wallH = st.wall * S;
      const topY = baseY - wallH;           // duvar üstü elmas merkezi
      // ---- duvarlar ----
      // sol yüz
      c.fillStyle = shade(st.wallC, 0.72);
      c.beginPath();
      c.moveTo(cx - dw, topY); c.lineTo(cx, topY + dh);
      c.lineTo(cx, baseY + dh); c.lineTo(cx - dw, baseY);
      c.closePath(); c.fill();
      // sağ yüz
      c.fillStyle = shade(st.wallC, 0.92);
      c.beginPath();
      c.moveTo(cx + dw, topY); c.lineTo(cx, topY + dh);
      c.lineTo(cx, baseY + dh); c.lineTo(cx + dw, baseY);
      c.closePath(); c.fill();
      // kapı (sağ yüzde koyu dikdörtgen)
      c.fillStyle = 'rgba(20,12,6,0.55)';
      const doorW = 5 * S, doorH = Math.min(9 * S, wallH * 0.7);
      c.fillRect(cx + dw * 0.35 - doorW / 2, baseY + dh * 0.35 - doorH, doorW, doorH);

      if (st.roof > 0) {
        // ---- çatı: dört yüzlü piramit (iki görünür yüz) ----
        const roofPeak = topY - st.roof * S;
        c.fillStyle = shade(st.roofC, 1.05);
        c.beginPath(); // sol çatı yüzü
        c.moveTo(cx - dw, topY); c.lineTo(cx, roofPeak); c.lineTo(cx, topY + dh);
        c.closePath(); c.fill();
        c.fillStyle = shade(st.roofC, 0.85);
        c.beginPath(); // sağ çatı yüzü
        c.moveTo(cx + dw, topY); c.lineTo(cx, roofPeak); c.lineTo(cx, topY + dh);
        c.closePath(); c.fill();
        c.fillStyle = shade(st.roofC, 1.18);
        c.beginPath(); // arka tepe yüzü (üst elmas yarısı)
        c.moveTo(cx - dw, topY); c.lineTo(cx, roofPeak); c.lineTo(cx + dw, topY);
        c.lineTo(cx, topY - dh);
        c.closePath(); c.fill();
      } else {
        // düz dam
        c.fillStyle = shade(st.roofC, 1.0);
        c.beginPath();
        c.moveTo(cx, topY - dh); c.lineTo(cx + dw, topY);
        c.lineTo(cx, topY + dh); c.lineTo(cx - dw, topY);
        c.closePath(); c.fill();
      }

      if (st.banner) {
        // bayrak direği (merkez binası)
        const px = cx + dw * 0.05, py = topY - st.roof * S;
        c.strokeStyle = '#5a4326';
        c.lineWidth = 1.6 * S;
        c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - 12 * S); c.stroke();
        c.fillStyle = '#c0503a';
        c.beginPath();
        c.moveTo(px, py - 12 * S); c.lineTo(px + 8 * S, py - 10 * S); c.lineTo(px, py - 8 * S);
        c.closePath(); c.fill();
      }
    }

    out.set(type, { cnv, w: fw, h: totalH, anchorY });
  }
  return out;
}

export { TILE_W, TILE_H };
