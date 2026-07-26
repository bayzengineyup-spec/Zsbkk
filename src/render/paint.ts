/* ============================================================
   BOYAMA YARDIMCILARI — onaylanan "gerçekçi v2" sanat yönünün
   ortak teknikleri (docs/concepts/stil-mockup2.html'den).
   Deterministik: her sprite kendi tohumuyla boyanır.
   ============================================================ */
import { makeRNG, type RNG } from '../core/rng';

export function shade(hex: string, m: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * m)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function painter(seed: number): { rng: RNG; R: (a: number, b: number) => number } {
  const rng = makeRNG(seed);
  return { rng, R: (a, b) => a + rng() * (b - a) };
}

/** Tek tek taş örülü duvar (dikdörtgen alan). */
export function stones(
  c: CanvasRenderingContext2D, rng: RNG,
  x: number, y: number, w: number, h: number, base: string,
): void {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = shade(base, 0.7);
  c.fillRect(x, y, w, h);
  const rows = Math.max(2, Math.round(h / 7));
  for (let r = 0; r < rows; r++) {
    let px = x + (r % 2 ? -4 : 0);
    const bh = h / rows;
    while (px < x + w + 4) {
      const bw = 6 + rng() * 9;
      const py = y + r * bh;
      c.fillStyle = shade(base, 0.82 + rng() * 0.32);
      c.fillRect(px + 0.6, py + 0.6, bw - 1.2, bh - 1.2);
      c.fillStyle = 'rgba(255,255,255,0.10)';
      c.fillRect(px + 0.6, py + 0.6, bw - 1.2, 1);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(px + 0.6, py + bh - 1.6, bw - 1.2, 1);
      px += bw + 1;
    }
  }
  c.restore();
}

/** Sıva yüzey: leke + çatlak + gren. */
export function plaster(
  c: CanvasRenderingContext2D, rng: RNG,
  x: number, y: number, w: number, h: number, base: string, light: number,
): void {
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, shade(base, light * 1.05));
  g.addColorStop(1, shade(base, light * 0.88));
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  for (let i = 0; i < 4; i++) { // leke
    const px = x + rng() * w, py = y + rng() * h, r = 3 + rng() * 8;
    const sg = c.createRadialGradient(px, py, 0.5, px, py, r);
    sg.addColorStop(0, `rgba(90,72,50,${0.06 + rng() * 0.1})`);
    sg.addColorStop(1, 'rgba(90,72,50,0)');
    c.fillStyle = sg;
    c.fillRect(px - r, py - r, r * 2, r * 2);
  }
  // alt nem
  const wg = c.createLinearGradient(0, y + h - 6, 0, y + h);
  wg.addColorStop(0, 'rgba(60,50,36,0)');
  wg.addColorStop(1, 'rgba(60,50,36,0.3)');
  c.fillStyle = wg;
  c.fillRect(x, y + h - 6, w, 6);
  // çatlak
  if (rng() < 0.8) {
    c.strokeStyle = 'rgba(70,56,40,0.4)';
    c.lineWidth = 0.7;
    let px = x + rng() * w, py = y + 1 + rng() * h * 0.4;
    c.beginPath(); c.moveTo(px, py);
    for (let s = 0; s < 3; s++) { px += (rng() - 0.5) * 5; py += 2 + rng() * 4; c.lineTo(px, py); }
    c.stroke();
  }
  for (let i = 0; i < 14; i++) { // gren
    c.fillStyle = `rgba(${rng() < 0.5 ? '255,255,255' : '20,16,10'},${0.03 + rng() * 0.04})`;
    c.fillRect(x + rng() * w, y + rng() * h, 1, 1);
  }
  c.restore();
}

/** Ahşap kiriş (damarlı). */
export function beam(
  c: CanvasRenderingContext2D, rng: RNG,
  x: number, y: number, w: number, h: number, base = '#5a4126',
): void {
  const vertical = h > w;
  const g = c.createLinearGradient(x, y, vertical ? x + w : x, vertical ? y : y + h);
  g.addColorStop(0, shade(base, 0.95));
  g.addColorStop(0.5, shade(base, 1.15));
  g.addColorStop(1, shade(base, 0.8));
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(30,20,10,0.4)';
  c.lineWidth = 0.6;
  const n = Math.max(2, Math.round((vertical ? w : h) / 2.4));
  for (let i = 1; i < n; i++) {
    c.beginPath();
    if (vertical) { c.moveTo(x + (w * i) / n, y + 1); c.lineTo(x + (w * i) / n + (rng() - 0.5), y + h - 1); }
    else { c.moveTo(x + 1, y + (h * i) / n); c.lineTo(x + w - 1, y + (h * i) / n + (rng() - 0.5)); }
    c.stroke();
  }
}

/** Kiremitli çatı yüzeyi (dörtgen, sıra sıra yarım daire kiremit). */
export function shingles(
  c: CanvasRenderingContext2D, rng: RNG,
  pts: [number, number][], base: string, rows: number,
): void {
  c.save();
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 4; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.clip();
  c.fillStyle = shade(base, 0.7);
  const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
  const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
  c.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const Lx = pts[0][0] + (pts[3][0] - pts[0][0]) * t;
    const Ly = pts[0][1] + (pts[3][1] - pts[0][1]) * t;
    const Rx = pts[1][0] + (pts[2][0] - pts[1][0]) * t;
    const Ry = pts[1][1] + (pts[2][1] - pts[1][1]) * t;
    const len = Math.hypot(Rx - Lx, Ry - Ly);
    const segs = Math.max(3, Math.round(len / 5));
    c.strokeStyle = 'rgba(20,12,8,0.45)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(Lx, Ly); c.lineTo(Rx, Ry); c.stroke();
    for (let s = 0; s < segs; s++) {
      const tt = s / segs;
      const px = Lx + (Rx - Lx) * tt;
      const py = Ly + (Ry - Ly) * tt;
      const sw = len / segs;
      c.fillStyle = shade(rng() < 0.12 ? '#7a4a30' : base, (0.82 + rng() * 0.3) * (1 - t * 0.16));
      c.beginPath();
      c.moveTo(px + 0.4, py - rows * 0.6 - 3.4);
      c.lineTo(px + sw - 0.4, py - rows * 0.6 - 3.4 + (Ry - Ly) / segs);
      c.lineTo(px + sw - 0.4, py + (Ry - Ly) / segs);
      c.arc(px + sw / 2, py + (Ry - Ly) / segs * 0.5, sw / 2 - 0.4, 0, Math.PI);
      c.closePath();
      c.fill();
    }
  }
  // yosun
  for (let i = 0; i < 3; i++) {
    const px = minX + rng() * (maxX - minX), py = minY + rng() * (maxY - minY);
    const r = 2 + rng() * 4;
    const mg = c.createRadialGradient(px, py, 0.5, px, py, r);
    mg.addColorStop(0, `rgba(90,110,50,${0.15 + rng() * 0.2})`);
    mg.addColorStop(1, 'rgba(90,110,50,0)');
    c.fillStyle = mg;
    c.fillRect(px - r, py - r, r * 2, r * 2);
  }
  c.restore();
  // mahya
  c.strokeStyle = shade('#4c2c1c', 0.95);
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.stroke();
  c.strokeStyle = shade('#6a3c26', 1.1);
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1] - 0.6); c.lineTo(pts[1][0], pts[1][1] - 0.6); c.stroke();
}

/** Pencere (gündüz camlı / gece ışıklı). */
export function windowPane(
  c: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, night: boolean,
): void {
  c.fillStyle = '#3a2c1a';
  c.fillRect(x - 1, y - 1, w + 2, h + 2);
  if (night) {
    const g = c.createRadialGradient(x + w / 2, y + h / 2, 0.5, x + w / 2, y + h / 2, w);
    g.addColorStop(0, '#ffd98a');
    g.addColorStop(1, '#b06818');
    c.fillStyle = g;
  } else {
    c.fillStyle = '#2c3844';
  }
  c.fillRect(x, y, w, h);
  if (!night) {
    c.fillStyle = 'rgba(200,220,235,0.3)';
    c.beginPath();
    c.moveTo(x, y + h * 0.25); c.lineTo(x + w * 0.55, y); c.lineTo(x + w * 0.85, y); c.lineTo(x + w * 0.25, y + h * 0.6);
    c.closePath(); c.fill();
  }
  c.strokeStyle = '#4a3820';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h);
  c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2);
  c.stroke();
}

/** Kalas kapı. */
export function plankDoor(
  c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
): void {
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#66492a');
  g.addColorStop(1, '#452f16');
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(25,16,8,0.6)';
  c.lineWidth = 0.8;
  c.strokeRect(x, y, w, h);
  for (let i = 1; i < 3; i++) {
    c.beginPath(); c.moveTo(x + (w * i) / 3, y + 0.5); c.lineTo(x + (w * i) / 3, y + h - 0.5); c.stroke();
  }
  c.fillStyle = '#c8a038';
  c.beginPath(); c.arc(x + w * 0.75, y + h * 0.5, 1.1, 0, 7); c.fill();
}
