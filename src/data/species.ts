/* ============================================================
   VERİ: Yaban hayatı türleri — prototipten sadeleştirilerek taşındı.
   Görsel ayrıntılar (boynuz, kuyruk tipi, iskelet) Faz 2'de gerçek
   dokularla gelecek; burada davranış + temel görünüm var.
   ============================================================ */
import type { BiomeId } from './biomes';

export type SpeciesKey = 'deer' | 'boar' | 'wolf' | 'bear' | 'rabbit' | 'sheep' | 'cow';

export interface SpeciesDef {
  name: string;
  /** gövde / koyu / karın renkleri */
  body: string;
  dark: string;
  belly: string;
  /** gövde uzunluğu ve yüksekliği (dünya-piksel ~z1) */
  len: number;
  hgt: number;
  spd: number;
  /** vahşi mi (haritaya doğal dağılır) */
  wild?: boolean;
  /** çiftlik hayvanı mı (tarla/avcı çevresinde belirir) */
  farm?: boolean;
  /** tehditten kaçma yarıçapı (0 = kaçmaz) */
  flee: number;
  /** yırtıcılık (köylüye yaklaşma eğilimi) */
  aggr?: number;
  /** sürü büyüklüğü */
  pack?: number;
  biomes: BiomeId[];
}

export const SPECIES: Record<SpeciesKey, SpeciesDef> = {
  deer:   { name: 'Geyik',        body: '#ba9466', dark: '#846440', belly: '#e0c8a4',
            len: 15, hgt: 9,  spd: 1.5, wild: true, flee: 7,
            biomes: ['grass', 'forest', 'savanna'] },
  boar:   { name: 'Yaban Domuzu', body: '#604c3a', dark: '#3a2c22', belly: '#806a54',
            len: 14, hgt: 9,  spd: 1.2, wild: true, flee: 5, aggr: 0.35,
            biomes: ['forest', 'swamp', 'taiga'] },
  wolf:   { name: 'Kurt',         body: '#7c7a7e', dark: '#4a484e', belly: '#a8a6aa',
            len: 15, hgt: 8,  spd: 1.9, wild: true, flee: 0, aggr: 0.85, pack: 3,
            biomes: ['forest', 'taiga', 'tundra'] },
  bear:   { name: 'Ayı',          body: '#5c422c', dark: '#36261a', belly: '#785c42',
            len: 17, hgt: 12, spd: 1.3, wild: true, flee: 0, aggr: 0.6,
            biomes: ['taiga', 'forest', 'mountain'] },
  rabbit: { name: 'Tavşan',       body: '#b2a28c', dark: '#7c6e5e', belly: '#e4dcce',
            len: 8,  hgt: 6,  spd: 2.2, wild: true, flee: 9,
            biomes: ['grass', 'savanna', 'forest'] },
  sheep:  { name: 'Koyun',        body: '#e2ded6', dark: '#a8a49c', belly: '#f0eee8',
            len: 12, hgt: 9,  spd: 0.9, farm: true, flee: 0, biomes: [] },
  cow:    { name: 'İnek',         body: '#e0dcd4', dark: '#3c3632', belly: '#f0eee8',
            len: 16, hgt: 11, spd: 0.8, farm: true, flee: 0, biomes: [] },
};

export const SPECIES_KEYS = Object.keys(SPECIES) as SpeciesKey[];
export const WILD_KEYS = SPECIES_KEYS.filter(k => SPECIES[k].wild);
