/* ============================================================
   VERİ: AI krallık kişilikleri + diplomasi eğilimleri + adlar
   Prototipten taşındı. Saf veri.
   ============================================================ */

export type PersonalityKey =
  | 'fatih' | 'barisci' | 'sinsi' | 'tuccar'
  | 'inzivaci' | 'fanatik' | 'bilge' | 'kaotik';

export interface Personality {
  name: string;
  icon: string;
  color: string;
  /** saldırganlık 0..1 */
  aggr: number;
  /** genişleme hızı 0..1 */
  expand: number;
  /** ticaret eğilimi 0..1 */
  trade: number;
  desc: string;
}

export const PERSONALITIES: Record<PersonalityKey, Personality> = {
  fatih:    { name: 'Fatih',    icon: '⚔️', color: '#c0392b', aggr: 0.9,  expand: 1.0, trade: 0.2, desc: 'Fetih peşinde, sürekli genişler' },
  barisci:  { name: 'Barışçıl', icon: '🕊️', color: '#2980b9', aggr: 0.15, expand: 0.6, trade: 0.9, desc: 'Gelişime ve ittifaka odaklı' },
  sinsi:    { name: 'Sinsi',    icon: '🐍', color: '#8e44ad', aggr: 0.6,  expand: 0.7, trade: 0.5, desc: 'Dost görünür, fırsat kollar' },
  tuccar:   { name: 'Tüccar',   icon: '💰', color: '#d4ac0d', aggr: 0.3,  expand: 0.7, trade: 1.0, desc: 'Zenginlik ve ticaret' },
  inzivaci: { name: 'İnzivacı', icon: '🏰', color: '#7f8c8d', aggr: 0.2,  expand: 0.3, trade: 0.3, desc: 'Kimseye bulaşmaz, sert savunur' },
  fanatik:  { name: 'Fanatik',  icon: '🔥', color: '#e67e22', aggr: 0.7,  expand: 0.9, trade: 0.3, desc: 'Yayılmacı, kültür dayatır' },
  bilge:    { name: 'Bilge',    icon: '📚', color: '#16a085', aggr: 0.4,  expand: 0.6, trade: 0.7, desc: 'Teknolojiye yatırır, geç güçlenir' },
  kaotik:   { name: 'Kaotik',   icon: '🎭', color: '#9b2d9b', aggr: 0.7,  expand: 0.8, trade: 0.4, desc: 'Tahmin edilemez' },
};

/** Kişiliklere göre teklif kabul eğilimleri — prototipten birebir. */
export interface DiploBase {
  ally: number; trade: number; truce: number; gift: number; betray: number;
}

export const DIPLO_BASE: Record<PersonalityKey, DiploBase> = {
  fatih:    { ally: 0.05, trade: 0.15, truce: 0.25, gift: 0.8, betray: 0.15 },
  barisci:  { ally: 0.55, trade: 0.75, truce: 0.90, gift: 1.2, betray: 0.00 },
  sinsi:    { ally: 0.65, trade: 0.60, truce: 0.70, gift: 1.0, betray: 0.85 },
  tuccar:   { ally: 0.40, trade: 0.95, truce: 0.75, gift: 1.4, betray: 0.05 },
  inzivaci: { ally: 0.10, trade: 0.25, truce: 0.60, gift: 0.6, betray: 0.00 },
  fanatik:  { ally: 0.18, trade: 0.30, truce: 0.35, gift: 0.7, betray: 0.25 },
  bilge:    { ally: 0.35, trade: 0.65, truce: 0.70, gift: 1.0, betray: 0.02 },
  kaotik:   { ally: 0.40, trade: 0.40, truce: 0.40, gift: 1.0, betray: 0.45 },
};

export const KINGDOM_NAMES: readonly string[] = [
  'Demirtaç', 'Akyel', 'Gökboru', 'Karadağ', 'Günbatı', 'Yeşilova', 'Buzkıran',
  'Altınyurt', 'Kızılbayrak', 'Bozkurt', 'Denizhan', 'Ateşoğlu', 'Gölgevadi',
  'Sarpkaya', 'Rüzgarlı',
];
