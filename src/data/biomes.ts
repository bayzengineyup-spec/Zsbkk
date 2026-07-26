/* ============================================================
   VERİ: Biyom tanımları
   Prototipten taşındı. Saf veri — mantık içermez.
   (Plan: docs/01-MIMARI "veri koddan ayrı" ilkesi.)
   ============================================================ */

export type BiomeId =
  | 'deep_water' | 'water' | 'shore' | 'beach'
  | 'grass' | 'savanna' | 'forest' | 'taiga'
  | 'desert' | 'swamp' | 'tundra' | 'snow'
  | 'rock' | 'mountain' | 'peak' | 'volcanic';

export type ResourceKind =
  | 'balık' | 'yiyecek' | 'at' | 'odun' | 'altın' | 'taş' | 'demir' | 'mermer';

export interface BiomeDef {
  /** Türkçe görünen ad */
  name: string;
  /** Üst yüzey rengi (izometrik karo tepesi) */
  top: string;
  /** Yan yüz rengi (karo duvarı) */
  side: string;
  /** Bu biyomda serpiştirilebilen kaynak */
  res: ResourceKind | null;
  /** Su karosu mu (üzerine inşa edilemez, ordu yürüyemez) */
  water?: boolean;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  deep_water: { name: 'Derin Deniz', top: '#173a5e', side: '#0f2842', res: null,     water: true },
  water:      { name: 'Deniz',       top: '#2166a0', side: '#164a78', res: 'balık',  water: true },
  shore:      { name: 'Sahil',       top: '#d9c48a', side: '#b09a5f', res: 'balık' },
  beach:      { name: 'Kumsal',      top: '#e8d49a', side: '#c2ab6d', res: null },
  /* Kara biyomları birbirine yakın tonlarda tutulur: karo sınırlarında
     sert renk elmasları oluşmasın, zemin tek yüzey gibi aksın. Orman
     ağaçlarla, savan sıcak tonla ayırt edilir. */
  grass:      { name: 'Çayır',       top: '#6aa84f', side: '#548540', res: 'yiyecek' },
  savanna:    { name: 'Savan',       top: '#8ba248', side: '#6f823a', res: 'at' },
  forest:     { name: 'Orman',       top: '#569447', side: '#457839', res: 'odun' },
  taiga:      { name: 'İğne Orman',  top: '#578a58', side: '#467047', res: 'odun' },
  desert:     { name: 'Çöl',         top: '#e0c064', side: '#b59a45', res: 'altın' },
  swamp:      { name: 'Bataklık',    top: '#68793f', side: '#536233', res: 'odun' },
  tundra:     { name: 'Tundra',      top: '#b8c0c2', side: '#8f989a', res: 'taş' },
  snow:       { name: 'Kar',         top: '#e8eef0', side: '#c0c9cc', res: null },
  rock:       { name: 'Kayalık',     top: '#8a8175', side: '#63594f', res: 'taş' },
  mountain:   { name: 'Dağ',         top: '#6d655c', side: '#4a443d', res: 'demir' },
  peak:       { name: 'Zirve',       top: '#f2f4f5', side: '#c7cdcf', res: 'mermer' },
  volcanic:   { name: 'Volkanik',    top: '#4a2d2a', side: '#301c1a', res: 'taş' },
};

/** Su/derin su gibi geçilmez-kurulamaz biyom mu? */
export function isWater(b: BiomeId): boolean {
  return BIOMES[b].water === true;
}
