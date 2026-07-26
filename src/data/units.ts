/* ============================================================
   VERİ: Birim türleri — taş-kağıt-makas dengesi (prototipten)
   Mızrakçı > Süvari > Okçu > Mızrakçı
   ============================================================ */
import type { Cost } from './buildings';
import type { PersonalityKey } from './personalities';

export type UnitKey = 'spear' | 'archer' | 'cav';

export interface UnitDef {
  name: string;
  icon: string;
  cost: Cost;
  atk: number;
  def: number;
  /** karşıtı (bu birime karşı bonus alır) */
  vs: UnitKey;
  /** eğitim süresi (saniye) */
  time: number;
  desc: string;
}

export const UNITS: Record<UnitKey, UnitDef> = {
  spear: {
    name: 'Mızrakçı', icon: '🛡️', cost: { food: 15, wood: 10 },
    atk: 9, def: 14, vs: 'cav', time: 8,
    desc: 'Süvariye karşı güçlü, ucuz ve dayanıklı',
  },
  archer: {
    name: 'Okçu', icon: '🏹', cost: { food: 12, wood: 20 },
    atk: 14, def: 11, vs: 'spear', time: 10,
    desc: 'Mızrakçıyı biçer, ama yakın dövüşte zayıf',
  },
  cav: {
    name: 'Süvari', icon: '🐎', cost: { food: 22, gold: 14 },
    atk: 16, def: 11, vs: 'archer', time: 14,
    desc: 'Okçuyu ezer, hızlı — ama sura karşı kötü',
  },
};

export const UNIT_KEYS: readonly UnitKey[] = ['spear', 'archer', 'cav'];

/** Karşıtına karşı bonus oranı (+%65). */
export const COUNTER_BONUS = 0.65;

export type UnitComp = Record<UnitKey, number>;

/** Kişiliğe göre AI ordu bileşimi (oran). */
export const AI_COMP: Record<PersonalityKey, Record<UnitKey, number>> = {
  fatih:    { spear: 0.35, archer: 0.15, cav: 0.50 },
  barisci:  { spear: 0.55, archer: 0.35, cav: 0.10 },
  sinsi:    { spear: 0.25, archer: 0.40, cav: 0.35 },
  tuccar:   { spear: 0.40, archer: 0.30, cav: 0.30 },
  inzivaci: { spear: 0.60, archer: 0.32, cav: 0.08 },
  fanatik:  { spear: 0.40, archer: 0.20, cav: 0.40 },
  bilge:    { spear: 0.25, archer: 0.60, cav: 0.15 },
  kaotik:   { spear: 0.33, archer: 0.33, cav: 0.34 },
};

export function compTotal(c: Partial<UnitComp>): number {
  return (c.spear ?? 0) + (c.archer ?? 0) + (c.cav ?? 0);
}

export function compLabel(c: Partial<UnitComp>): string {
  const parts = UNIT_KEYS
    .filter(t => (c[t] ?? 0) > 0)
    .map(t => UNITS[t].icon + (c[t] ?? 0));
  return parts.length ? parts.join(' ') : '—';
}
