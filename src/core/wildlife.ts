/* ============================================================
   YABAN HAYATI — yerleşim, dolaşım, kaçış, avcı yaklaşımı.
   Prototipten taşındı; BİLİNÇLİ SAPMA: prototip yalnız kameraya
   yakın hayvanları simüle ediyordu (LOD) — bu, kamera durumunu
   sim'e sızdırıp DETERMİNİZMİ bozar. Burada tüm hayvanlar her
   tick simüle edilir (≤140 hayvan, ucuz).
   ============================================================ */
import type { RNG } from './rng';
import type { World } from './world';
import type { Building, Villager } from './sim';
import { SPECIES, WILD_KEYS, type SpeciesKey } from '../data/species';
import { isWater } from '../data/biomes';

export interface Creature {
  id: number;
  sp: SpeciesKey;
  x: number; y: number;
  px: number; py: number;   // interpolasyon
  hx: number; hy: number;   // yuva merkezi
  tx: number; ty: number;
  wait: number;
  speed: number;
  fleeT: number;
  scale: number;
  flip: boolean;
  bob: number;
  /** çiftlik hayvanıysa bağlı bina karosu */
  farmX?: number; farmY?: number;
}

export interface WildlifeHost {
  rng: RNG;
  world: World;
  villagers(): Villager[];
  buildings(): Building[];
}

export class WildlifeSystem {
  creatures: Creature[] = [];
  private nextCrID = 1;
  private farmSyncAcc = 0;

  constructor(private readonly host: WildlifeHost) {}

  private makeCreature(key: SpeciesKey, x: number, y: number): Creature {
    const S = SPECIES[key];
    const rng = this.host.rng;
    return {
      id: this.nextCrID++, sp: key,
      x: x + 0.5, y: y + 0.5, px: x + 0.5, py: y + 0.5,
      hx: x + 0.5, hy: y + 0.5, tx: x + 0.5, ty: y + 0.5,
      wait: rng() * 4,
      speed: S.spd * (0.85 + rng() * 0.3),
      fleeT: 0,
      scale: 0.9 + rng() * 0.22,
      flip: rng() < 0.5,
      bob: rng() * 6.28,
    };
  }

  spawn(): void {
    const { rng, world } = this.host;
    this.creatures = [];
    this.nextCrID = 1;
    const target = Math.min(140, Math.round((world.W * world.H) / 950));
    let tries = 0;
    while (this.creatures.length < target && tries < target * 40) {
      tries++;
      const x = 3 + ((rng() * (world.W - 6)) | 0);
      const y = 3 + ((rng() * (world.H - 6)) | 0);
      const b = world.tiles[world.idx(x, y)];
      const cand = WILD_KEYS.filter(k => SPECIES[k].biomes.includes(b));
      if (!cand.length) continue;
      const key = cand[(rng() * cand.length) | 0];
      const S = SPECIES[key];
      const n = S.pack ? 1 + ((rng() * S.pack) | 0) : 1; // sürü
      for (let i = 0; i < n && this.creatures.length < target; i++) {
        this.creatures.push(this.makeCreature(
          key,
          Math.max(1, Math.min(world.W - 2, x + ((rng() * 4 - 2) | 0))),
          Math.max(1, Math.min(world.H - 2, y + ((rng() * 4 - 2) | 0))),
        ));
      }
    }
  }

  /** Çiftlik hayvanları: tarla/avcı kulübesi çevresinde belirir. */
  private syncFarmAnimals(): void {
    const { rng, world } = this.host;
    const farms = this.host.buildings().filter(b => b.type === 'farm' || b.type === 'hunter');
    const want = Math.min(18, farms.length * 3);
    let have = this.creatures.filter(c => SPECIES[c.sp].farm).length;
    while (have < want && farms.length) {
      const b = farms[(rng() * farms.length) | 0];
      const key: SpeciesKey = rng() < 0.6 ? 'sheep' : 'cow';
      const c = this.makeCreature(
        key,
        Math.max(1, Math.min(world.W - 2, b.x + ((rng() * 4 - 2) | 0))),
        Math.max(1, Math.min(world.H - 2, b.y + ((rng() * 4 - 2) | 0))),
      );
      c.farmX = b.x; c.farmY = b.y;
      this.creatures.push(c);
      have++;
    }
    // binası yıkılan çiftlik hayvanları vahşi doğaya karışır (bağ çözülür)
    for (const c of this.creatures) {
      if (c.farmX === undefined) continue;
      if (!this.host.buildings().some(b => b.x === c.farmX && b.y === c.farmY)) {
        c.farmX = undefined; c.farmY = undefined;
      }
    }
  }

  private threatNear(c: Creature, r: number): Villager | null {
    const r2 = r * r;
    for (const v of this.host.villagers()) {
      const dx = v.x - c.x, dy = v.y - c.y;
      if (dx * dx + dy * dy < r2) return v;
    }
    return null;
  }

  tick(dt: number): void {
    const { rng, world } = this.host;

    this.farmSyncAcc += dt;
    if (this.farmSyncAcc > 2) {
      this.farmSyncAcc = 0;
      this.syncFarmAnimals();
    }

    for (const c of this.creatures) {
      c.px = c.x; c.py = c.y;
      c.bob += dt * 3;
      const S = SPECIES[c.sp];

      // kaçış
      if (S.flee > 0) {
        const th = this.threatNear(c, S.flee);
        if (th) {
          c.fleeT = 1.6;
          const dx = c.x - th.x, dy = c.y - th.y;
          const d = Math.hypot(dx, dy) || 1;
          c.tx = c.x + (dx / d) * 6;
          c.ty = c.y + (dy / d) * 6;
        }
      }
      // yırtıcı: köylüye yaklaşır (korkutur — saldırı hasarı ileride)
      if (S.aggr && c.fleeT <= 0) {
        const prey = this.threatNear(c, 9);
        if (prey && rng() < S.aggr * dt * 0.5) { c.tx = prey.x; c.ty = prey.y; }
      }
      if (c.fleeT > 0) c.fleeT -= dt;

      const dx = c.tx - c.x, dy = c.ty - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.12) {
        c.wait -= dt;
        if (c.wait <= 0) {
          // yeni hedef: yuva (veya çiftlik) çevresinde
          const rad = c.farmX !== undefined ? 2.5 : 6;
          const hx = c.farmX !== undefined ? c.farmX + 0.5 : c.hx;
          const hy = c.farmY !== undefined ? c.farmY + 0.5 : c.hy;
          c.tx = Math.max(0.5, Math.min(world.W - 1.5, hx + (rng() * 2 - 1) * rad));
          c.ty = Math.max(0.5, Math.min(world.H - 1.5, hy + (rng() * 2 - 1) * rad));
          c.wait = 1.5 + rng() * 4;
        }
      } else {
        const spd = (c.fleeT > 0 ? S.spd * 1.9 : c.speed) * dt;
        c.x += (dx / dist) * Math.min(spd, dist);
        c.y += (dy / dist) * Math.min(spd, dist);
        if (Math.abs(dx - dy) > 0.02) c.flip = dx - dy < 0;
        // suya girmesin
        const gi = world.idx(
          Math.max(0, Math.min(world.W - 1, c.x | 0)),
          Math.max(0, Math.min(world.H - 1, c.y | 0)),
        );
        if (isWater(world.tiles[gi])) { c.x = c.px; c.y = c.py; c.wait = 0; }
      }
    }
  }

  serialize(): unknown {
    return { creatures: this.creatures, nextCrID: this.nextCrID, farmSyncAcc: this.farmSyncAcc };
  }

  restore(data: unknown): void {
    const d = data as { creatures: Creature[]; nextCrID: number; farmSyncAcc: number };
    this.creatures = d.creatures;
    this.nextCrID = d.nextCrID;
    this.farmSyncAcc = d.farmSyncAcc;
  }
}
