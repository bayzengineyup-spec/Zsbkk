/* ============================================================
   VERİ: Bina tanımları — prototipten taşındı. Saf veri.
   prod: her işçinin saniyede ürettiği kaynak
   on: kurulum kuralı (biyom/komşuluk)
   ============================================================ */

export type BuildingType =
  | 'center' | 'house' | 'woodcutter' | 'quarry' | 'farm'
  | 'hunter' | 'mine' | 'storehouse' | 'academy' | 'barracks' | 'wall';

export type ResKey = 'food' | 'wood' | 'stone' | 'gold' | 'know';
export type Cost = Partial<Record<ResKey, number>>;
export type PlaceRule = 'land' | 'near_wood' | 'near_stone' | 'fertile' | 'near_gold';

export interface CenterUpgrade { cost: Cost; popCap: number; }

export interface BuildingDef {
  name: string;
  icon: string;
  cat: 'merkez' | 'nüfus' | 'üretim' | 'depo' | 'kültür' | 'askeri';
  cost: Cost;
  maxWorkers: number;
  desc: string;
  on: PlaceRule;
  popCap?: number;
  prod?: Partial<Record<ResKey, number>>;
  storage?: number;
  defense?: number;
  unique?: boolean;
  upgrade?: CenterUpgrade[];
}

export const BASE_STORAGE = 450;

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  center: {
    name: 'Köy Meydanı', icon: '🏛️', cat: 'merkez',
    cost: {}, maxWorkers: 0, popCap: 5, unique: true,
    desc: 'Krallığının kalbi. Seviyesi her şeyin sınırını belirler.',
    on: 'land',
    upgrade: [
      { cost: { wood: 120, stone: 40 }, popCap: 12 },
      { cost: { wood: 400, stone: 200 }, popCap: 24 },
      { cost: { wood: 1200, stone: 800, gold: 300 }, popCap: 40 },
    ],
  },
  house: {
    name: 'Ev', icon: '🏠', cat: 'nüfus',
    cost: { wood: 30 }, maxWorkers: 0, popCap: 6,
    desc: 'Nüfus kapasiteni artırır.', on: 'land',
  },
  woodcutter: {
    name: 'Oduncu', icon: '🪓', cat: 'üretim',
    cost: { wood: 20 }, maxWorkers: 3, prod: { wood: 0.4 },
    desc: 'Ormana yakın kurulunca odun üretir.', on: 'near_wood',
  },
  quarry: {
    name: 'Taş Ocağı', icon: '⛏️', cat: 'üretim',
    cost: { wood: 40 }, maxWorkers: 3, prod: { stone: 0.35 },
    desc: 'Taşlık/dağ yakınında taş çıkarır.', on: 'near_stone',
  },
  farm: {
    name: 'Tarla', icon: '🌾', cat: 'üretim',
    cost: { wood: 25 }, maxWorkers: 4, prod: { food: 0.5 },
    desc: 'Çayır ve verimli topraklarda yiyecek üretir.', on: 'fertile',
  },
  hunter: {
    name: 'Avcı Kulübesi', icon: '🏹', cat: 'üretim',
    cost: { wood: 35 }, maxWorkers: 2, prod: { food: 0.4 },
    desc: 'Orman ve savanda avlanarak yiyecek sağlar.', on: 'near_wood',
  },
  mine: {
    name: 'Altın Madeni', icon: '💰', cat: 'üretim',
    cost: { wood: 60, stone: 40 }, maxWorkers: 3, prod: { gold: 0.12 },
    desc: 'Altın kaynağı üzerinde altın çıkarır.', on: 'near_gold',
  },
  storehouse: {
    name: 'Ambar', icon: '📦', cat: 'depo',
    cost: { wood: 50 }, maxWorkers: 0, storage: 900,
    desc: 'Tüm kaynakların depo limitini artırır.', on: 'land',
  },
  academy: {
    name: 'Akademi', icon: '📜', cat: 'kültür',
    cost: { wood: 120, stone: 100 }, maxWorkers: 3, prod: { know: 0.09 },
    desc: 'Bilgi üretir. Teknoloji araştırmanın şartı.', on: 'land',
  },
  barracks: {
    name: 'Kışla', icon: '⚔️', cat: 'askeri',
    cost: { wood: 80, stone: 40 }, maxWorkers: 0,
    desc: 'Boşta köylüleri askere çevirir. Ordunun kaynağı.', on: 'land',
  },
  wall: {
    name: 'Sur', icon: '🧱', cat: 'askeri',
    cost: { stone: 60 }, maxWorkers: 0, defense: 15,
    desc: 'Köyünün savunmasını artırır, baskınları zorlaştırır.', on: 'land',
  },
};

/** Maliyeti "🪵30 🪨40" biçiminde yaz. */
export function costStr(cost: Cost): string {
  const ICONS: Record<ResKey, string> = {
    food: '🍞', wood: '🪵', stone: '🪨', gold: '🪙', know: '📜',
  };
  const parts: string[] = [];
  for (const k of Object.keys(cost) as ResKey[]) {
    const v = cost[k];
    if (v !== undefined && v > 0) parts.push(`${ICONS[k]}${v}`);
  }
  return parts.length ? parts.join(' ') : 'bedava';
}
