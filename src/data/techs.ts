/* ============================================================
   VERİ: Teknoloji ağacı (4 dal, 16 teknoloji) + komutan özellikleri
   Prototipten taşındı. Saf veri.
   ============================================================ */
import type { Cost } from './buildings';

export type TechBranch = 'eko' | 'ask' | 'ins' | 'kul';

export type TechId =
  | 'plow' | 'sawmill' | 'deepdig' | 'market'
  | 'ironw' | 'armor' | 'siege' | 'cavtr'
  | 'masonry' | 'sturdy' | 'granary' | 'housing'
  | 'rites' | 'diplo' | 'spynet' | 'legend';

export interface TechDef {
  br: TechBranch;
  name: string;
  icon: string;
  cost: Cost;
  desc: string;
  req?: TechId;
}

export const TECHS: Record<TechId, TechDef> = {
  // EKONOMİ
  plow:    { br: 'eko', name: 'Gelişmiş Saban',       icon: '🌾', cost: { know: 30 },              desc: 'Tarla üretimi +%30' },
  sawmill: { br: 'eko', name: 'Testere Atölyesi',     icon: '🪚', cost: { know: 45, wood: 200 },   desc: 'Oduncu üretimi +%30', req: 'plow' },
  deepdig: { br: 'eko', name: 'Derin Kazı',           icon: '⛏️', cost: { know: 70, stone: 250 },  desc: 'Taş ve maden +%35', req: 'sawmill' },
  market:  { br: 'eko', name: 'Pazar Ağı',            icon: '💰', cost: { know: 100, gold: 300 },  desc: 'Ticaret geliri +%60', req: 'deepdig' },
  // ASKERİ
  ironw:   { br: 'ask', name: 'Demir Silahlar',       icon: '⚔️', cost: { know: 40, stone: 150 },  desc: 'Tüm birimler saldırı +%18' },
  armor:   { br: 'ask', name: 'Zırh Sanatı',          icon: '🛡️', cost: { know: 60, stone: 250 },  desc: 'Tüm birimler savunma +%18', req: 'ironw' },
  siege:   { br: 'ask', name: 'Kuşatma Mühendisliği', icon: '🏰', cost: { know: 90, wood: 400 },   desc: 'Surlara karşı +%60 etki', req: 'armor' },
  cavtr:   { br: 'ask', name: 'Süvari Talimi',        icon: '🐎', cost: { know: 80, gold: 250 },   desc: 'Süvari gücü +%30', req: 'ironw' },
  // İNŞAAT
  masonry: { br: 'ins', name: 'Taş Ustalığı',         icon: '🧱', cost: { know: 35 },              desc: 'Bina maliyeti -%20' },
  sturdy:  { br: 'ins', name: 'Sağlam Yapı',          icon: '🏛️', cost: { know: 55, stone: 200 },  desc: 'Yangın ve deprem riski -%50', req: 'masonry' },
  granary: { br: 'ins', name: 'Büyük Ambarlar',       icon: '📦', cost: { know: 70, wood: 300 },   desc: 'Depo kapasitesi +%60', req: 'masonry' },
  housing: { br: 'ins', name: 'Kat Mimarisi',         icon: '🏠', cost: { know: 95, stone: 300 },  desc: 'Her ev +3 nüfus', req: 'granary' },
  // KÜLTÜR
  rites:   { br: 'kul', name: 'Tapınak Ayinleri',     icon: '🕯️', cost: { know: 30 },              desc: 'Mutluluk +12' },
  diplo:   { br: 'kul', name: 'Diplomasi Okulu',      icon: '🤝', cost: { know: 55, gold: 200 },   desc: 'İlişki kazancı +%60', req: 'rites' },
  spynet:  { br: 'kul', name: 'Casus Ağı',            icon: '🕵️', cost: { know: 75, gold: 300 },   desc: 'Casusluk hep başarılı, yarı fiyat', req: 'diplo' },
  legend:  { br: 'kul', name: 'Efsaneler',            icon: '⭐', cost: { know: 110, gold: 400 },  desc: 'Komutan tecrübesi 2 kat', req: 'spynet' },
};

export const TECH_BRANCH: Record<TechBranch, string> = {
  eko: 'Ekonomi', ask: 'Askeri', ins: 'İnşaat', kul: 'Kültür',
};

/* ---------------- KOMUTAN ÖZELLİKLERİ ---------------- */
export type CmdTraitKey =
  | 'siegemaster' | 'swift' | 'bloodscent' | 'shieldwall' | 'tactician' | 'inspiring';

export interface CmdTrait {
  name: string;
  icon: string;
  desc: string;
  wall?: number;
  speed?: number;
  atk?: number;
  def?: number;
  loss?: number;
}

export const CMD_TRAITS: Record<CmdTraitKey, CmdTrait> = {
  siegemaster: { name: 'Kuşatma Ustası', icon: '🏰', desc: 'Sura karşı +%40', wall: 1.40 },
  swift:       { name: 'Süratli',        icon: '💨', desc: 'Ordu hızı +%40', speed: 1.40 },
  bloodscent:  { name: 'Kan Kokusu',     icon: '🩸', desc: 'Saldırı +%25', atk: 1.25 },
  shieldwall:  { name: 'Kalkan Duvarı',  icon: '🛡️', desc: 'Savunma +%30', def: 1.30 },
  tactician:   { name: 'Taktikçi',       icon: '🧠', desc: 'Kayıplar -%35', loss: 0.65 },
  inspiring:   { name: 'İlham Veren',    icon: '🎺', desc: 'Saldırı ve savunma +%15', atk: 1.15, def: 1.15 },
};

export const CMD_NAMES: readonly string[] = [
  'Alparslan', 'Bayezid', 'Cengiz', 'Demirhan', 'Ertuğrul', 'Fatih', 'Gökhan',
  'Hakan', 'Kılıçarslan', 'Melikşah', 'Orhan', 'Sancar', 'Tuğrul', 'Yavuz',
  'Balaban', 'Konur',
];
