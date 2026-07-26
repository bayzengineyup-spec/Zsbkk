/* ============================================================
   ARAYÜZ TEMASI — onaylanan gerçekçi stile uygun parşömen ve
   ahşap dokuları çalışma anında üretilir, CSS değişkeni olarak
   köke yazılır (harici dosya yok; her şey kendi içinde).
   Kozmetiktir — sim'e girmez, sabit tohum kullanır.
   ============================================================ */
import { makeRNG } from '../core/rng';

function parchmentTex(): string {
  const w = 256, h = 256;
  const cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  const c = cnv.getContext('2d')!;
  const rng = makeRNG(4242);

  // taban: hafif eğimli sıcak ton
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#e0cfa4');
  g.addColorStop(0.5, '#d8c598');
  g.addColorStop(1, '#cfba8c');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);

  // eskime lekeleri
  for (let i = 0; i < 26; i++) {
    const x = rng() * w, y = rng() * h, r = 8 + rng() * 30;
    const s = c.createRadialGradient(x, y, 1, x, y, r);
    s.addColorStop(0, `rgba(140,108,64,${0.03 + rng() * 0.07})`);
    s.addColorStop(1, 'rgba(140,108,64,0)');
    c.fillStyle = s;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // kâğıt lifleri (çoğu yatay, kısa ince çizgiler)
  c.lineWidth = 0.6;
  for (let i = 0; i < 320; i++) {
    const x = rng() * w, y = rng() * h, len = 3 + rng() * 12;
    const a = (rng() - 0.5) * 0.5 + (rng() < 0.5 ? 0 : Math.PI / 2);
    c.strokeStyle = rng() < 0.5
      ? `rgba(120,92,56,${0.04 + rng() * 0.05})`
      : `rgba(255,244,214,${0.05 + rng() * 0.06})`;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
  }
  // benekler
  for (let i = 0; i < 220; i++) {
    c.fillStyle = rng() < 0.5
      ? `rgba(90,66,36,${0.03 + rng() * 0.05})`
      : `rgba(255,248,224,${0.04 + rng() * 0.05})`;
    c.fillRect(rng() * w, rng() * h, 1, 1);
  }
  return cnv.toDataURL();
}

function woodTex(): string {
  const w = 256, h = 128;
  const cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  const c = cnv.getContext('2d')!;
  const rng = makeRNG(3131);

  const plankH = 32;
  for (let p = 0; p < h / plankH; p++) {
    const y = p * plankH;
    const tone = 0.9 + rng() * 0.25;
    const g = c.createLinearGradient(0, y, 0, y + plankH);
    g.addColorStop(0, `rgb(${Math.round(86 * tone)},${Math.round(62 * tone)},${Math.round(38 * tone)})`);
    g.addColorStop(0.5, `rgb(${Math.round(72 * tone)},${Math.round(52 * tone)},${Math.round(31 * tone)})`);
    g.addColorStop(1, `rgb(${Math.round(58 * tone)},${Math.round(41 * tone)},${Math.round(24 * tone)})`);
    c.fillStyle = g;
    c.fillRect(0, y, w, plankH);
    // damarlar: dalgalı yatay çizgiler
    for (let v = 0; v < 7; v++) {
      c.strokeStyle = `rgba(28,18,8,${0.18 + rng() * 0.2})`;
      c.lineWidth = 0.7 + rng() * 0.8;
      c.beginPath();
      let vy = y + 3 + rng() * (plankH - 6);
      c.moveTo(0, vy);
      for (let x = 0; x <= w; x += 16) {
        vy += (rng() - 0.5) * 2.4;
        vy = Math.max(y + 2, Math.min(y + plankH - 2, vy));
        c.lineTo(x, vy);
      }
      c.stroke();
    }
    // budak
    if (rng() < 0.8) {
      const kx = rng() * w, ky = y + 6 + rng() * (plankH - 12);
      c.strokeStyle = 'rgba(30,18,8,0.5)';
      c.lineWidth = 1;
      for (let r = 2; r < 6; r += 1.6) {
        c.beginPath();
        c.ellipse(kx, ky, r * 1.5, r, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    // plaka ayrımı + ışık kenarı
    c.fillStyle = 'rgba(16,9,4,0.7)';
    c.fillRect(0, y + plankH - 1.5, w, 1.5);
    c.fillStyle = 'rgba(200,160,100,0.12)';
    c.fillRect(0, y, w, 1);
  }
  return cnv.toDataURL();
}

/** Dokuları üret ve CSS değişkenlerine yaz — main.ts başında bir kez çağrılır. */
export function applyTheme(): void {
  const r = document.documentElement.style;
  r.setProperty('--tex-parchment', `url(${parchmentTex()})`);
  r.setProperty('--tex-wood', `url(${woodTex()})`);
}
