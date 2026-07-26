/* ============================================================
   GÜNDÜZ / GECE — prototipten taşındı. Saf fonksiyonlar (sim
   zamanından türetilir, durum tutmaz — determinizmi etkilemez).
   ============================================================ */

export const DAY_LEN = 240; // saniye (4 dakika = 1 gün)

export function dayPhase(t: number): number {
  return (t % DAY_LEN) / DAY_LEN; // 0 = gece yarısı
}

/** 0 = zifiri gece, 1 = öğle. */
export function dayLight(t: number): number {
  return 0.5 - 0.5 * Math.cos(dayPhase(t) * Math.PI * 2);
}

/** Ekran örtüsü [r,g,b,a] (0..1) — tam gündüzde null. */
export function dayTint(t: number): [number, number, number, number] | null {
  const L = dayLight(t);
  const p = dayPhase(t);
  if (L > 0.86) return null; // tam gündüz
  // gece: koyu mavi; şafak/akşam: turuncu
  const dusk = Math.exp(-Math.pow((p - 0.22) / 0.09, 2))
    + Math.exp(-Math.pow((p - 0.78) / 0.09, 2));
  const night = Math.max(0, 1 - L);
  const r = 0.06 + dusk * 0.62;
  const g = 0.09 + dusk * 0.30;
  const b = 0.24 + dusk * 0.10;
  const a = Math.min(0.55, night * 0.55 + dusk * 0.16);
  return [r, g, b, a];
}

export function timeOfDayLabel(t: number): string {
  const p = dayPhase(t);
  if (p < 0.17) return '🌙 Gece';
  if (p < 0.30) return '🌅 Şafak';
  if (p < 0.68) return '☀️ Gündüz';
  if (p < 0.83) return '🌇 Akşam';
  return '🌙 Gece';
}
