/* ============================================================
   SİM ÇEKİRDEĞİ — prototipin oyun mantığı, saf ve deterministik.
   Kurallar (docs/01-MIMARI):
   - DOM yok, Date.now yok, Math.random yok (yalnız tohumlu RNG)
   - Dış dünyaya çıktı: olay kuyruğu (events) — UI her karede tüketir
   - Girdi: applyCommand (UI komut üretir, sim uygular)
   Alt sistemler: EventSystem (felaketler), KingdomSystem (AI+diplomasi),
   sis (keşif). Tam serialize/restore → kayıt & determinizm testi.
   ============================================================ */
import { makeRNG, type RNG } from './rng';
import type { World } from './world';
import type { Command } from './commands';
import { EventSystem, type EventHost } from './events';
import { KingdomSystem, type KingdomHost } from './kingdoms';
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
  burning?: boolean;
  hp?: number;
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
  reputation: number; // 0..100 — diplomaside herkesin sana bakışı
}

export interface TimeState { t: number; seasonIdx: number; year: number; }

export interface SimEvent {
  type: 'toast';
  msg: string;
  kind: '' | 'good' | 'bad';
}

/** Kayıt formatı sürümü — migrasyon için (docs/10-KAYIT). */
export const SAVE_VERSION = 1;

export class Sim {
  readonly world: World;
  player: PlayerState;
  villagers: Villager[] = [];
  time: TimeState = { t: 0, seasonIdx: 0, year: 1 };
  readonly events: EventSystem;
  readonly kingdoms: KingdomSystem;

  /** Sis: 0 = hiç görülmedi, 1 = keşfedildi, 2 = şu an görüşte */
  vis: Uint8Array;
  private lastVisible: number[] = [];
  /** Sis değişti mi (render önbelleği için ipucu) */
  fogDirty = true;

  private uiEvents: SimEvent[] = [];
  private rng: RNG;
  private nextVID = 1;
  private starveAcc = 0;
  private popGrowAcc = 0;
  private fogAcc = 0;

  constructor(world: World) {
    this.world = world;
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
      reputation: 50,
    };
    this.vis = new Uint8Array(world.W * world.H);

    // ---- alt sistem bağlantıları (host arayüzleri) ----
    const eventHost: EventHost = {
      rng: this.rng,
      buildings: () => this.player.buildings,
      removeBuilding: (b) => this.removeBuilding(b),
      pop: () => this.player.pop,
      popCap: () => this.player.popCap,
      idle: () => this.player.idle,
      happy: () => this.player.happy,
      addHappy: (d) => { this.player.happy = Math.max(0, Math.min(100, this.player.happy + d)); },
      hasCenter: () => this.player.hasCenter,
      addPop: (n) => this.addPop(n),
      killVillager: () => this.killOne(),
      addRes: (k, n) => {
        this.player.res[k] = Math.min(this.player.storageCap, this.player.res[k] + n);
      },
      takeGold: (n) => { this.player.res.gold = Math.max(0, this.player.res.gold - n); },
      season: () => this.currentSeason(),
      year: () => this.time.year,
      toast: (msg, kind) => this.toast(msg, kind ?? ''),
    };
    this.events = new EventSystem(eventHost);

    const kingdomHost: KingdomHost = {
      world: this.world,
      rng: this.rng,
      playerRes: this.player.res,
      playerStorageCap: () => this.player.storageCap,
      playerHasCenter: () => this.player.hasCenter,
      playerPower: () => this.playerPower(),
      reputation: () => this.player.reputation,
      changeReputation: (d, r) => this.changeReputation(d, r),
      villageCenter: () => this.villageCenter(),
      revealCircle: (x, y, r) => this.revealCircle(x, y, r),
      isTileVisible: (i) => this.vis[i] > 0,
      toast: (msg, kind) => this.toast(msg, kind ?? ''),
    };
    this.kingdoms = new KingdomSystem(kingdomHost);
  }

  // ---------- olay kuyruğu ----------
  private toast(msg: string, kind: '' | 'good' | 'bad' = ''): void {
    this.uiEvents.push({ type: 'toast', msg, kind });
  }

  drainEvents(): SimEvent[] {
    const out = this.uiEvents;
    this.uiEvents = [];
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

  playerPower(): number {
    const p = this.player;
    return Math.round(p.pop * 0.5 + p.buildings.length * 2 + p.res.gold * 0.02);
  }

  changeReputation(delta: number, reason: string): void {
    this.player.reputation = Math.max(0, Math.min(100, this.player.reputation + delta));
    if (delta <= -10) {
      for (const kk of this.kingdoms.kingdoms) {
        kk.relation = Math.max(-100, kk.relation - Math.abs(delta) * 0.4);
      }
      this.toast(`📉 İtibarın zedelendi: ${reason}`, 'bad');
    }
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
    if (isWater(b)) return false;
    if (this.buildingAt(x, y)) return false;
    const rule = BUILDINGS[type].on;
    if (rule === 'land') return true;
    if (rule === 'fertile') {
      return ['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore'].includes(b);
    }
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
      case 'demolish': return this.demolishAt(cmd.x, cmd.y);
      case 'extinguish': {
        const b = this.buildingAt(cmd.x, cmd.y);
        return b ? this.events.extinguish(b) : false;
      }
      case 'diplo': return this.kingdoms.applyAction(cmd.kingdomId, cmd.action);
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
    this.updateFog();
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

  private demolishAt(x: number, y: number): boolean {
    const b = this.buildingAt(x, y);
    if (!b) return false;
    if (b.type === 'center') { this.toast('Köy Meydanı yıkılamaz.', 'bad'); return false; }
    this.removeBuilding(b);
    this.toast(`${BUILDINGS[b.type].name} yıkıldı.`, '');
    return true;
  }

  removeBuilding(b: Building): void {
    if (b.workers > 0) { this.player.idle += b.workers; b.workers = 0; }
    this.player.buildings = this.player.buildings.filter(x => x !== b);
    if (b.type === 'center') {
      this.player.hasCenter = this.player.buildings.some(x => x.type === 'center');
    }
    this.recalcCaps();
    this.assignJobsToVillagers();
  }

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

  // ---------- nüfus yardımcıları (olay sistemi de kullanır) ----------
  addPop(n: number): void {
    const p = this.player;
    if (n >= 0) {
      p.pop += n; p.idle += n;
    } else {
      const loss = Math.min(p.pop, -n);
      for (let i = 0; i < loss; i++) {
        p.pop--;
        if (p.idle > 0) p.idle--; else this.releaseOneWorker();
      }
    }
    this.syncVillagers();
  }

  private killOne(): void {
    const p = this.player;
    if (p.pop <= 0) return;
    p.pop--;
    if (p.idle > 0) p.idle--; else this.releaseOneWorker();
    this.syncVillagers();
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
            v.tx = v.job.bx + 0.5 + (this.rng() * 1.4 - 0.7);
            v.ty = v.job.by + 0.5 + (this.rng() * 1.4 - 0.7);
            v.wait = 0.6 + this.rng() * 1.2;
          } else {
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

  private releaseOneWorker(): void {
    for (const b of this.player.buildings) {
      if (b.workers > 0) { b.workers--; return; }
    }
  }

  // ---------- SİS (keşif) — prototipten ----------
  /** Oyuna başlarken verimli bir vadi seç. */
  pickStartRegion(): { x: number; y: number } {
    const w = this.world;
    let best: { x: number; y: number } | null = null;
    let bestScore = -1;
    const cx0 = w.W / 2, cy0 = w.H / 2;
    for (let tries = 0; tries < 400; tries++) {
      const x = 12 + ((this.rng() * (w.W - 24)) | 0);
      const y = 12 + ((this.rng() * (w.H - 24)) | 0);
      const b = w.tiles[w.idx(x, y)];
      if (isWater(b) || b === 'peak' || b === 'mountain' || b === 'rock') continue;
      let score = 0;
      for (let dy = -4; dy <= 4; dy += 2) {
        for (let dx = -4; dx <= 4; dx += 2) {
          const nx = x + dx, ny = y + dy;
          if (!w.inBounds(nx, ny)) continue;
          const nb = w.tiles[w.idx(nx, ny)];
          if (nb === 'grass' || nb === 'savanna') score += 3;
          else if (nb === 'forest' || nb === 'taiga') score += 2;
          else if (nb === 'water' || nb === 'shore') score += 2;
          else if (nb === 'beach') score += 1;
        }
      }
      score -= (Math.hypot(x - cx0, y - cy0) / w.W) * 6;
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    return best ?? { x: (w.W / 2) | 0, y: (w.H / 2) | 0 };
  }

  /** Başlangıç alanını yumuşak kenarlı aç. */
  revealStartArea(cx: number, cy: number, r: number): void {
    const w = this.world;
    for (let y = Math.max(0, cy - r); y <= Math.min(w.H - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(w.W - 1, cx + r); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        const i = y * w.W + x;
        if (d > r * 0.72 && this.rng() < (d - r * 0.72) / (r * 0.28)) continue;
        this.vis[i] = 1;
      }
    }
    this.fogDirty = true;
  }

  revealCircle(cx: number, cy: number, r: number): void {
    const w = this.world;
    const r2 = r * r;
    const x0 = Math.max(0, (cx - r) | 0), x1 = Math.min(w.W - 1, (cx + r) | 0);
    const y0 = Math.max(0, (cy - r) | 0), y1 = Math.min(w.H - 1, (cy + r) | 0);
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy > r2) continue;
        const i = y * w.W + x;
        if (this.vis[i] !== 2) { this.lastVisible.push(i); this.fogDirty = true; }
        this.vis[i] = 2;
      }
    }
  }

  private updateFog(): void {
    // önceki görüş alanını "keşfedildi" seviyesine düşür
    for (const i of this.lastVisible) if (this.vis[i] === 2) this.vis[i] = 1;
    this.lastVisible.length = 0;
    for (const b of this.player.buildings) {
      const r = b.type === 'center' ? 9 + b.level : (b.type === 'wall' ? 4 : 6);
      this.revealCircle(b.x, b.y, r);
    }
    for (const v of this.villagers) this.revealCircle(v.x | 0, v.y | 0, 4);
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

    const season = this.currentSeason();
    const moodMult = 0.6 + (p.happy / 100) * 0.6;
    const evMult = this.events.effectMult('prodMult');
    for (const b of p.buildings) {
      const def = BUILDINGS[b.type];
      if (!def.prod || b.workers <= 0) continue;
      if (b.burning) continue; // yanan bina üretmez
      for (const k of Object.keys(def.prod) as ResKey[]) {
        let gain = (def.prod[k] ?? 0) * b.workers * b.level * moodMult * evMult * dt;
        if (k === 'food') gain *= season.farm;
        p.res[k] = Math.min(p.storageCap, p.res[k] + gain);
      }
    }

    p.res.food -= p.pop * 0.06 * dt * season.food * this.events.effectMult('foodMult');

    this.updateHappiness(dt);

    if (p.res.food < 0) {
      p.res.food = 0;
      this.starveAcc += dt;
      if (this.starveAcc >= 3 && p.pop > 0) {
        this.starveAcc = 0;
        const dead = this.villagers.length
          ? this.villagers[(this.rng() * this.villagers.length) | 0].name
          : 'Bir köylü';
        this.killOne();
        this.toast(`${dead} açlıktan öldü. 💀`, 'bad');
      }
    } else {
      this.starveAcc = 0;
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

  private updateHappiness(dt: number): void {
    const p = this.player;
    let target = 55;
    const foodRatio = p.res.food / Math.max(1, p.pop * 3);
    target += Math.max(-25, Math.min(20, (foodRatio - 1) * 20));
    if (p.popCap > p.pop) target += 8;
    if (p.popCap <= p.pop) target -= 10;
    if (p.res.gold > 50) target += 5;
    target = Math.max(0, Math.min(100, target));
    p.happy += (target - p.happy) * Math.min(1, dt * 0.5);
  }

  // ---------- ana tick ----------
  tick(dt: number): void {
    for (const v of this.villagers) { v.px = v.x; v.py = v.y; }
    this.updateTime(dt);
    this.events.tick(dt);
    this.economyTick(dt);
    this.updateVillagers(dt);
    this.kingdoms.tick(dt);
    // sis: her tick değil, ~saniyede 2 kez (performans)
    this.fogAcc += dt;
    if (this.fogAcc >= 0.5) {
      this.fogAcc = 0;
      if (this.player.hasCenter) this.updateFog();
    }
  }

  // ---------- kayıt / yükleme ----------
  serialize(): unknown {
    return {
      v: SAVE_VERSION,
      world: { seed: this.world.seed, W: this.world.W, H: this.world.H },
      rngState: this.rng.getState(),
      nextVID: this.nextVID,
      starveAcc: this.starveAcc,
      popGrowAcc: this.popGrowAcc,
      fogAcc: this.fogAcc,
      player: this.player,
      villagers: this.villagers,
      time: this.time,
      events: this.events.serialize(),
      kingdoms: this.kingdoms.serialize(),
      vis: Array.from(this.vis),
      lastVisible: this.lastVisible,
    };
  }

  /** Kayıttan geri yükle — dünya aynı tohumdan yeniden üretilmiş olmalı. */
  static restore(world: World, data: unknown): Sim {
    const d = data as ReturnType<Sim['serialize']> & {
      rngState: number; nextVID: number; starveAcc: number; popGrowAcc: number;
      fogAcc: number; player: PlayerState; villagers: Villager[]; time: TimeState;
      events: unknown; kingdoms: unknown; vis: number[]; lastVisible: number[];
    };
    const sim = new Sim(world);
    sim.rng.setState(d.rngState);
    sim.nextVID = d.nextVID;
    sim.starveAcc = d.starveAcc;
    sim.popGrowAcc = d.popGrowAcc;
    sim.fogAcc = d.fogAcc;
    // player nesnesi kingdoms host'una referansla bağlı — içeriği kopyala
    Object.assign(sim.player, d.player);
    Object.assign(sim.player.res, (d.player as PlayerState).res);
    sim.villagers = d.villagers;
    sim.time = d.time;
    sim.events.restore(d.events);
    sim.kingdoms.restore(d.kingdoms);
    sim.vis.set(d.vis);
    sim.lastVisible = d.lastVisible;
    sim.fogDirty = true;
    return sim;
  }

  /** Deterministik durum özeti — testler için. */
  snapshot(): unknown {
    return {
      res: this.player.res,
      pop: this.player.pop,
      idle: this.player.idle,
      popCap: this.player.popCap,
      happy: Math.round(this.player.happy * 1e6) / 1e6,
      reputation: this.player.reputation,
      hasCenter: this.player.hasCenter,
      buildings: this.player.buildings,
      villagers: this.villagers.map(v => ({
        id: v.id, name: v.name,
        x: Math.round(v.x * 1e6) / 1e6, y: Math.round(v.y * 1e6) / 1e6,
        job: v.job,
      })),
      time: this.time,
      effects: this.events.activeEffects.map(e => e.key),
      kingdoms: this.kingdoms.kingdoms.map(k => ({
        id: k.id, name: k.name, pers: k.persKey, pop: k.pop,
        power: k.power, tiles: k.tiles.size,
        relation: Math.round(k.relation * 1e6) / 1e6,
        status: k.status,
      })),
      visSum: this.vis.reduce((a, b) => a + b, 0),
    };
  }
}
