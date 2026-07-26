/* ============================================================
   VERİ: Mevsimler — prototipten taşındı. Saf veri.
   farm: tarla üretim çarpanı · food: tüketim çarpanı
   fire: yangın risk çarpanı (olay sistemi gelince kullanılacak)
   ============================================================ */

export const SEASON_LEN = 90; // saniye

export type SeasonKey = 'ilkbahar' | 'yaz' | 'sonbahar' | 'kis';

export interface SeasonDef {
  key: SeasonKey;
  name: string;
  icon: string;
  farm: number;
  food: number;
  fire: number;
  tint: string;
}

export const SEASONS: readonly SeasonDef[] = [
  { key: 'ilkbahar', name: 'İlkbahar', icon: '🌱', farm: 1.25, food: 1.0, fire: 0.6, tint: 'rgba(120,200,120,0.05)' },
  { key: 'yaz',      name: 'Yaz',      icon: '☀️', farm: 1.05, food: 1.0, fire: 2.2, tint: 'rgba(255,220,120,0.06)' },
  { key: 'sonbahar', name: 'Sonbahar', icon: '🍂', farm: 1.15, food: 1.0, fire: 1.0, tint: 'rgba(220,150,80,0.06)' },
  { key: 'kis',      name: 'Kış',      icon: '❄️', farm: 0.25, food: 1.6, fire: 0.3, tint: 'rgba(150,190,235,0.09)' },
];
