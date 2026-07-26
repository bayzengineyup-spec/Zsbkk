/* ============================================================
   VERİ: Bina tanımları — prototipten taşındı. Saf veri.
   prod: her işçinin saniyede ürettiği kaynak
   on: kurulum kuralı (biyom/komşuluk)
   ============================================================ */

export type BuildingType =
  | 'center' | 'house' | 'woodcutter' | 'quarry' | 'farm'
  | 'hunter' | 'mine' | 'storehouse' | 'academy' | 'barracks' | 'wall'
  | 'lumbermill' | 'mill' | 'bakery';

/**
 * Kaynaklar. Zincir kaynakları (Faz 1 M2):
 * wood → plank (Bıçkıhane) · food(tahıl) → flour (Değirmen) → bread (Fırın)
 * Ekmek premium gıdadır: 1 ekmek = 2 yiyecek değerinde tüketilir + mutluluk.
 */
export type ResKey =
  | 'food' | 'wood' | 'stone' | 'gold' | 'know'
  | 'plank' | 'flour' | 'bread';
export type Cost = Partial<Record<ResKey, number>>;
export type PlaceRule = 'land' | 'near_wood' | 'near_stone' | 'fertile' | 'near_gold';

export interface CenterUpgrade { cost: Cost; popCap: number; time: number; }

export interface BuildingDef {
  name: string;
  icon: string;
  cat: 'merkez' | 'nüfus' | 'üretim' | 'depo' | 'kültür' | 'askeri';
  cost: Cost;
  maxWorkers: number;
  desc: string;
  on: PlaceRule;
  /** inşa süresi (saniye) — işçiler hızlandırır */
  buildTime: number;
  /** azami seviye (1 = yükseltilemez; merkez kendi tablosunu kullanır) */
  maxLevel: number;
  popCap?: number;
  prod?: Partial<Record<ResKey, number>>;
  /** işçi başına saniyede tüketilen girdi (zincir binaları) —
      girdi yetmezse üretim aynı oranda kısılır */
  input?: Partial<Record<ResKey, number>>;
  storage?: number;
  defense?: number;
  unique?: boolean;
  upgrade?: CenterUpgrade[];
}

/** Genel bina yükseltme maliyeti: taban maliyet × hedef seviye × 1.5. */
export function upgradeCost(def: BuildingDef, targetLevel: number): Cost {
  const o: Cost = {};
  for (const k of Object.keys(def.cost) as ResKey[]) {
    o[k] = Math.ceil((def.cost[k] ?? 0) * targetLevel * 1.5);
  }
  return o;
}

/** Genel bina yükseltme süresi. */
export function upgradeTime(def: BuildingDef, targetLevel: number): number {
  return Math.round(def.buildTime * (1 + 0.6 * (targetLevel - 1)));
}

export const BASE_STORAGE = 450;

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  center: {
    name: 'Köy Meydanı', icon: '🏛️', cat: 'merkez',
    cost: {}, maxWorkers: 0, popCap: 5, unique: true,
    desc: 'Krallığının kalbi. Seviyesi her şeyin sınırını belirler.',
    on: 'land', buildTime: 15, maxLevel: 4,
    upgrade: [
      { cost: { wood: 120, stone: 40 }, popCap: 12, time: 25 },
      { cost: { wood: 400, stone: 200 }, popCap: 24, time: 45 },
      { cost: { wood: 1200, stone: 800, gold: 300 }, popCap: 40, time: 80 },
    ],
  },
  house: {
    name: 'Ev', icon: '🏠', cat: 'nüfus',
    cost: { wood: 30 }, maxWorkers: 0, popCap: 6,
    desc: 'Nüfus kapasiteni artırır. Her seviye +3 kapasite.', on: 'land',
    buildTime: 10, maxLevel: 3,
  },
  woodcutter: {
    name: 'Oduncu', icon: '🪓', cat: 'üretim',
    cost: { wood: 20 }, maxWorkers: 3, prod: { wood: 0.4 },
    desc: 'Ormana yakın kurulunca odun üretir.', on: 'near_wood',
    buildTime: 8, maxLevel: 3,
  },
  quarry: {
    name: 'Taş Ocağı', icon: '⛏️', cat: 'üretim',
    cost: { wood: 40 }, maxWorkers: 3, prod: { stone: 0.35 },
    desc: 'Taşlık/dağ yakınında taş çıkarır.', on: 'near_stone',
    buildTime: 10, maxLevel: 3,
  },
  farm: {
    name: 'Tarla', icon: '🌾', cat: 'üretim',
    cost: { wood: 25 }, maxWorkers: 4, prod: { food: 0.5 },
    desc: 'Çayır ve verimli topraklarda yiyecek üretir.', on: 'fertile',
    buildTime: 8, maxLevel: 3,
  },
  hunter: {
    name: 'Avcı Kulübesi', icon: '🏹', cat: 'üretim',
    cost: { wood: 35 }, maxWorkers: 2, prod: { food: 0.4 },
    desc: 'Orman ve savanda avlanarak yiyecek sağlar.', on: 'near_wood',
    buildTime: 8, maxLevel: 3,
  },
  mine: {
    name: 'Altın Madeni', icon: '💰', cat: 'üretim',
    cost: { wood: 60, stone: 40 }, maxWorkers: 3, prod: { gold: 0.12 },
    desc: 'Altın kaynağı üzerinde altın çıkarır.', on: 'near_gold',
    buildTime: 14, maxLevel: 3,
  },
  storehouse: {
    name: 'Ambar', icon: '📦', cat: 'depo',
    cost: { wood: 50 }, maxWorkers: 0, storage: 900,
    desc: 'Depo limitini artırır. Her seviye katlar.', on: 'land',
    buildTime: 12, maxLevel: 3,
  },
  academy: {
    name: 'Akademi', icon: '📜', cat: 'kültür',
    cost: { wood: 120, stone: 100 }, maxWorkers: 3, prod: { know: 0.09 },
    desc: 'Bilgi üretir. Teknoloji araştırmanın şartı.', on: 'land',
    buildTime: 20, maxLevel: 2,
  },
  barracks: {
    name: 'Kışla', icon: '⚔️', cat: 'askeri',
    cost: { wood: 80, stone: 40 }, maxWorkers: 0,
    desc: 'Boşta köylüleri askere çevirir. Ordunun kaynağı.', on: 'land',
    buildTime: 16, maxLevel: 2,
  },
  wall: {
    name: 'Sur', icon: '🧱', cat: 'askeri',
    cost: { stone: 60 }, maxWorkers: 0, defense: 15,
    desc: 'Köyünün savunmasını artırır, baskınları zorlaştırır.', on: 'land',
    buildTime: 6, maxLevel: 1,
  },
  // ---- üretim zinciri binaları (Faz 1 M2) ----
  lumbermill: {
    name: 'Bıçkıhane', icon: '🪚', cat: 'üretim',
    cost: { wood: 60, stone: 20 }, maxWorkers: 2,
    input: { wood: 0.5 }, prod: { plank: 0.25 },
    desc: 'Odunu keresteye çevirir. Kereste, gelişmiş binaların şartıdır.',
    on: 'land', buildTime: 14, maxLevel: 3,
  },
  mill: {
    name: 'Değirmen', icon: '⚙️', cat: 'üretim',
    cost: { wood: 40, plank: 10 }, maxWorkers: 2,
    input: { food: 0.4 }, prod: { flour: 0.3 },
    desc: 'Tahılı una öğütür. Fırının girdisi.',
    on: 'land', buildTime: 12, maxLevel: 3,
  },
  bakery: {
    name: 'Fırın', icon: '🥖', cat: 'üretim',
    cost: { wood: 30, stone: 30, plank: 10 }, maxWorkers: 2,
    input: { flour: 0.3 }, prod: { bread: 0.25 },
    desc: 'Undan ekmek pişirir. Ekmek 2 kat besler ve halkı mutlu eder.',
    on: 'land', buildTime: 12, maxLevel: 3,
  },
};

export const RES_ICONS: Record<ResKey, string> = {
  food: '🍞', wood: '🪵', stone: '🪨', gold: '🪙', know: '📜',
  plank: '🪚', flour: '🌫', bread: '🥖',
};

/** Maliyeti "🪵30 🪨40" biçiminde yaz. */
export function costStr(cost: Cost): string {
  const ICONS = RES_ICONS;
  const parts: string[] = [];
  for (const k of Object.keys(cost) as ResKey[]) {
    const v = cost[k];
    if (v !== undefined && v > 0) parts.push(`${ICONS[k]}${v}`);
  }
  return parts.length ? parts.join(' ') : 'bedava';
}
