/* ============================================================
   SİM ÇEKİRDEĞİ — prototipin oyun mantığı, saf ve deterministik.
   Kurallar (docs/01-MIMARI):
   - DOM yok, Date.now yok, Math.random yok (yalnız tohumlu RNG)
   - Dış dünyaya çıktı: olay kuyruğu (events) — UI her karede tüketir
   - Girdi: applyCommand (UI komut üretir, sim uygular)
   ============================================================ */
import { makeRNG, type RNG } from './rng';
import type { World } from './world';
import type { Command } from './commands';
import {
  BUILDINGS, BASE_STORAGE,
  type BuildingType, type Cost, type ResKey,
} from '../data/buildings';
import { SEASONS, SEASON_LEN, type SeasonDef } from '../data/seasons';
import { ADLAR } from '../data/names';
import { isWater } from '../data/biomes';

export interface Building {
  type: BuildingType;
  x: number;
  y: number;
  level: number;
  workers: number;
}

export interface Villager {
  id: number;
  name: string;
  x: number; y: number;    // dünya konumu (ondalık = karo içi)
  px: number; py: number;  // önceki tick konumu (render interpolasyonu)
  tx: number; ty: number;  // hedef
  job: { bx: number; by: number } | null;
  speed: number;
  wait: number;
  bob: number;
}

export interface PlayerState {
  res: Record<ResKey, number>;
  pop: number;
  idle: number;
  hasCenter: boolean;
  buildings: Building[];
  storageCap: number;
  popCap: number;
  happy: number;
}

export interface TimeState { t: number; seasonIdx: number; year: number; }

export interface SimEvent {
  type: 'toast';
  msg: string;
  kind: '' | 'good' | 'bad';
}

export class Sim {
  readonly world: World;
  player: PlayerState;
  villagers: Villager[] = [];
  time: TimeState = { t: 0, seasonIdx: 0, year: 1 };
  /** UI'nin tüketeceği olaylar (toast vb.) — drainEvents ile alınır. */
  private events: SimEvent[] = [];

  private rng: RNG;
  private nextVID = 1;
  private starveAcc = 0;
  private popGrowAcc = 0;

  constructor(world: World) {
    this.world = world;
    // sim RNG akışı dünya tohumundan türetilir ama ayrı akıştır
    this.rng = makeRNG((world.seed ^ 0x5f3a9c1) >>> 0);
    this.player = {
      res: { food: 120, wood: 150, stone: 60, gold: 30, know: 0 },
      pop: 5,
      idle: 5,
      hasCenter: false,
      buildings: [],
      storageCap: BASE_STORAGE,
      popCap: 0,
      happy: 70,
    };
  }

  // ---------- olay kuyruğu ----------
  private toast(msg: string, kind: '' | 'good' | 'bad' = ''): void {
    this.events.push({ type: 'toast', msg, kind });
  }

  /** Birikmiş olayları al ve kuyruğu boşalt (UI her karede çağırır). */
  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ---------- yardımcılar ----------
  currentSeason(): SeasonDef { return SEASONS[this.time.seasonIdx]; }

  buildingAt(x: number, y: number): Building | null {
    return this.player.buildings.find(b => b.x === x && b.y === y) ?? null;
  }

  villageCenter(): { x: number; y: number } {
    const c = this.player.buildings.find(b => b.type === 'center');
    if (c) return { x: c.x, y: c.y };
    const first = this.player.buildings[0];
    return first ? { x: first.x, y: first.y } : { x: this.world.W / 2, y: this.world.H / 2 };
  }

  canAfford(cost: Cost): boolean {
    for (const k of Object.keys(cost) as ResKey[]) {
      if (this.player.res[k] < (cost[k] ?? 0)) return false;
    }
    return true;
  }

  private pay(cost: Cost): void {
    for (const k of Object.keys(cost) as ResKey[]) {
      this.player.res[k] -= cost[k] ?? 0;
    }
  }

  /** Kurulabilirlik kontrolü — prototipten birebir. */
  canPlaceOn(type: BuildingType, x: number, y: number): boolean {
    const w = this.world;
    if (!w.inBounds(x, y)) return false;
    const i = w.idx(x, y);
    const b = w.tiles[i];
    if (isWater(b)) return false;                      // su üstüne kurulamaz
    if (this.buildingAt(x, y)) return false;           // dolu karo
    const rule = BUILDINGS[type].on;
    if (rule === 'land') return true;
    if (rule === 'fertile') {
      return ['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore'].includes(b);
    }
    // komşulukta kaynak/biyom arama
    const near = (test: (bi: string, r: string | null) => boolean): boolean => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!w.inBounds(nx, ny)) continue;
          const j = w.idx(nx, ny);
          if (test(w.tiles[j], w.res[j])) return true;
        }
      }
      return false;
    };
    if (rule === 'near_wood') return near((bi, r) => bi === 'forest' || bi === 'taiga' || bi === 'swamp' || r === 'odun');
    if (rule === 'near_stone') return near((bi, r) => bi === 'rock' || bi === 'mountain' || bi === 'peak' || r === 'taş');
    if (rule === 'near_gold') return near((bi, r) => r === 'altın' || bi === 'desert');
    return true;
  }

  // ---------- komut uygulama ----------
  applyCommand(cmd: Command): boolean {
    switch (cmd.kind) {
      case 'place': return this.placeBuilding(cmd.building, cmd.x, cmd.y);
      case 'assign': return this.assignWorker(cmd.x, cmd.y, cmd.delta);
      case 'upgradeCenter': return this.upgradeCenter(cmd.x, cmd.y);
      case 'demolish': return this.demolish(cmd.x, cmd.y);
    }
  }

  private placeBuilding(type: BuildingType, x: number, y: number): boolean {
    const def = BUILDINGS[type];
    if (def.unique && this.player.buildings.some(b => b.type === type)) {
      this.toast(`Zaten bir ${def.name} var.`, 'bad'); return false;
    }
    if (!this.canPlaceOn(type, x, y)) { this.toast('Buraya kurulamaz.', 'bad'); return false; }
    if (!this.canAfford(def.cost)) { this.toast('Yeterli kaynak yok.', 'bad'); return false; }
    this.pay(def.cost);
    this.player.buildings.push({ type, x, y, level: 1, workers: 0 });
    if (type === 'center') {
      this.player.hasCenter = true;
      this.syncVillagers();
    }
    this.recalcCaps();
    this.toast(`${def.name} kuruldu.`, 'good');
    return true;
  }

  private assignWorker(x: number, y: number, delta: 1 | -1): boolean {
    const b = this.buildingAt(x, y);
    if (!b) return false;
    const def = BUILDINGS[b.type];
    if (!def.maxWorkers) return false;
    if (delta > 0) {
      if (this.player.idle <= 0) { this.toast('Boşta köylü yok.', 'bad'); return false; }
      if (b.workers >= def.maxWorkers) { this.toast('Bina dolu.', 'bad'); return false; }
      b.workers++; this.player.idle--;
    } else {
      if (b.workers <= 0) return false;
      b.workers--; this.player.idle++;
    }
    this.assignJobsToVillagers();
    return true;
  }

  private upgradeCenter(x: number, y: number): boolean {
    const b = this.buildingAt(x, y);
    if (!b || b.type !== 'center') return false;
    const ups = BUILDINGS.center.upgrade!;
    if (b.level - 1 >= ups.length) { this.toast('Azami seviyede.', 'bad'); return false; }
    const nx = ups[b.level - 1];
    if (!this.canAfford(nx.cost)) { this.toast('Yükseltme için kaynak yetersiz.', 'bad'); return false; }
    this.pay(nx.cost);
    b.level++;
    this.recalcCaps();
    this.toast(`Köy Meydanı seviye ${b.level}! 🎉`, 'good');
    return true;
  }

  private demolish(x: number, y: number): boolean {
    const b = this.buildingAt(x, y);
    if (!b) return false;
    if (b.type === 'center') { this.toast('Köy Meydanı yıkılamaz.', 'bad'); return false; }
    this.removeBuilding(b);
    this.toast(`${BUILDINGS[b.type].name} yıkıldı.`, '');
    return true;
  }

  /** Bina kaldır (yıkım / ileride yangın-felaket). */
  removeBuilding(b: Building): void {
    if (b.workers > 0) { this.player.idle += b.workers; b.workers = 0; }
    this.player.buildings = this.player.buildings.filter(x => x !== b);
    if (b.type === 'center') {
      this.player.hasCenter = this.player.buildings.some(x => x.type === 'center');
    }
    this.recalcCaps();
    this.assignJobsToVillagers();
  }

  /** Kapasiteleri yeniden hesapla — prototipten (tech çarpanları Faz 0 sonunda). */
  recalcCaps(): void {
    let popCap = 0, storage = BASE_STORAGE;
    for (const b of this.player.buildings) {
      const def = BUILDINGS[b.type];
      if (def.popCap) {
        popCap += (b.type === 'center' && b.level > 1)
          ? BUILDINGS.center.upgrade![b.level - 2].popCap
          : def.popCap;
      }
      if (def.storage) storage += def.storage;
    }
    this.player.popCap = popCap;
    this.player.storageCap = storage;
  }

  // ---------- köylüler ----------
  private makeVillager(x: number, y: number): Villager {
    const fx = x + 0.5, fy = y + 0.5;
    return {
      id: this.nextVID++,
      name: ADLAR[(this.rng() * ADLAR.length) | 0],
      x: fx, y: fy, px: fx, py: fy, tx: fx, ty: fy,
      job: null,
      speed: 0.8 + this.rng() * 0.4,
      wait: this.rng() * 2,
      bob: this.rng() * 6.28,
    };
  }

  /** Nüfus değişince köylü listesini senkronla. */
  syncVillagers(): void {
    while (this.villagers.length < this.player.pop) {
      const c = this.villageCenter();
      this.villagers.push(this.makeVillager(
        c.x + ((this.rng() * 4 - 2) | 0),
        c.y + ((this.rng() * 4 - 2) | 0),
      ));
    }
    while (this.villagers.length > this.player.pop) this.villagers.pop();
    this.assignJobsToVillagers();
  }

  /** Binalardaki işçi sayısına göre köylülere iş ata. */
  private assignJobsToVillagers(): void {
    for (const v of this.villagers) v.job = null;
    let vi = 0;
    for (const b of this.player.buildings) {
      const def = BUILDINGS[b.type];
      if (!def.maxWorkers) continue;
      for (let w = 0; w < b.workers && vi < this.villagers.length; w++) {
        this.villagers[vi].job = { bx: b.x, by: b.y };
        vi++;
      }
    }
  }

  private updateVillagers(dt: number): void {
    const c = this.villageCenter();
    const w = this.world;
    for (const v of this.villagers) {
      v.bob += dt * 4;
      const dx = v.tx - v.x, dy = v.ty - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.08) {
        v.wait -= dt;
        if (v.wait <= 0) {
          if (v.job) {
            // işinin binası çevresinde çalış
            v.tx = v.job.bx + 0.5 + (this.rng() * 1.4 - 0.7);
            v.ty = v.job.by + 0.5 + (this.rng() * 1.4 - 0.7);
            v.wait = 0.6 + this.rng() * 1.2;
          } else {
            // boşta: merkez çevresinde dolaş
            v.tx = c.x + 0.5 + (this.rng() * 5 - 2.5);
            v.ty = c.y + 0.5 + (this.rng() * 5 - 2.5);
            v.wait = 1 + this.rng() * 2.5;
          }
          v.tx = Math.max(0, Math.min(w.W - 1, v.tx));
          v.ty = Math.max(0, Math.min(w.H - 1, v.ty));
        }
      } else {
        const step = v.speed * dt;
        v.x += (dx / dist) * Math.min(step, dist);
        v.y += (dy / dist) * Math.min(step, dist);
      }
    }
  }

  /** Açlık ölümü için: işçisi olan bir binadan bir işçi çek. */
  private releaseOneWorker(): void {
    for (const b of this.player.buildings) {
      if (b.workers > 0) { b.workers--; return; }
    }
  }

  // ---------- zaman & mevsim ----------
  private updateTime(dt: number): void {
    this.time.t += dt;
    const idx = Math.floor(this.time.t / SEASON_LEN) % 4;
    if (idx !== this.time.seasonIdx) {
      this.time.seasonIdx = idx;
      const s = this.currentSeason();
      if (idx === 0) { this.time.year++; this.toast(`📅 ${this.time.year}. yıl başladı.`); }
      this.toast(`${s.icon} ${s.name} geldi.`, s.key === 'kis' ? 'bad' : 'good');
      // sonbahar hasat bonusu
      if (s.key === 'sonbahar' && this.player.hasCenter) {
        const bonus = Math.round(this.player.pop * 6);
        this.player.res.food = Math.min(this.player.storageCap, this.player.res.food + bonus);
        this.toast(`🍂 Hasat! +${bonus} yiyecek.`, 'good');
      }
    }
  }

  // ---------- ekonomi tick ----------
  private economyTick(dt: number): void {
    const p = this.player;
    if (!p.hasCenter) return;

    // --- üretim ---
    const season = this.currentSeason();
    const moodMult = 0.6 + (p.happy / 100) * 0.6; // 0.6x - 1.2x
    for (const b of p.buildings) {
      const def = BUILDINGS[b.type];
      if (!def.prod || b.workers <= 0) continue;
      for (const k of Object.keys(def.prod) as ResKey[]) {
        let gain = (def.prod[k] ?? 0) * b.workers * b.level * moodMult * dt;
        if (k === 'food') gain *= season.farm;         // mevsim tarımı etkiler
        p.res[k] = Math.min(p.storageCap, p.res[k] + gain);
      }
    }

    // --- yiyecek tüketimi: her nüfus yer ---
    p.res.food -= p.pop * 0.06 * dt * season.food;

    // --- mutluluk (yumuşak geçiş) ---
    this.updateHappiness(dt);

    // --- açlık: yiyecek biterse halk ölür ---
    if (p.res.food < 0) {
      p.res.food = 0;
      this.starveAcc += dt;
      if (this.starveAcc >= 3 && p.pop > 0) {
        this.starveAcc = 0;
        const dead = this.villagers.length
          ? this.villagers[(this.rng() * this.villagers.length) | 0].name
          : 'Bir köylü';
        p.pop = Math.max(0, p.pop - 1);
        if (p.idle > 0) p.idle--; else this.releaseOneWorker();
        this.syncVillagers();
        this.toast(`${dead} açlıktan öldü. 💀`, 'bad');
      }
    } else {
      this.starveAcc = 0;
      // --- nüfus artışı: yiyecek + kapasite + mutluluk şartı ---
      if (p.pop < p.popCap && p.res.food > p.pop * 2 && p.happy > 30) {
        this.popGrowAcc += dt * (p.happy / 70);
        const need = Math.max(4, 10 - p.popCap * 0.1);
        if (this.popGrowAcc >= need) {
          this.popGrowAcc = 0;
          p.pop++; p.idle++;
          this.syncVillagers();
          this.toast('Yeni bir köylü doğdu. 👶', 'good');
        }
      }
    }
  }

  /** Mutluluk: yiyecek bolluğu, konut, hazine — prototipten. */
  private updateHappiness(dt: number): void {
    const p = this.player;
    let target = 55;
    const foodRatio = p.res.food / Math.max(1, p.pop * 3);
    target += Math.max(-25, Math.min(20, (foodRatio - 1) * 20));
    if (p.popCap > p.pop) target += 8;
    if (p.popCap <= p.pop) target -= 10; // tıka basa dolu
    if (p.res.gold > 50) target += 5;
    target = Math.max(0, Math.min(100, target));
    p.happy += (target - p.happy) * Math.min(1, dt * 0.5);
  }

  // ---------- ana tick ----------
  tick(dt: number): void {
    // interpolasyon için önceki konumları sakla
    for (const v of this.villagers) { v.px = v.x; v.py = v.y; }
    this.updateTime(dt);
    this.economyTick(dt);
    this.updateVillagers(dt);
  }

  /** Deterministik durum özeti — testler ve ileride kayıt için. */
  snapshot(): unknown {
    return {
      res: this.player.res,
      pop: this.player.pop,
      idle: this.player.idle,
      popCap: this.player.popCap,
      storageCap: this.player.storageCap,
      happy: Math.round(this.player.happy * 1e6) / 1e6,
      hasCenter: this.player.hasCenter,
      buildings: this.player.buildings,
      villagers: this.villagers.map(v => ({
        id: v.id, name: v.name,
        x: Math.round(v.x * 1e6) / 1e6, y: Math.round(v.y * 1e6) / 1e6,
        job: v.job,
      })),
      time: this.time,
    };
  }
}
