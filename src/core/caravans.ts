/* ============================================================
   TİCARET KERVANLARI — prototipten taşındı.
   Ticaret anlaşmalı krallıklardan oyuncuya altın taşır; savaştaki
   saldırgan krallıkların topraklarından geçerken yağmalanabilir.
   ============================================================ */
import type { RNG } from './rng';
import type { World } from './world';
import type { KingdomSystem } from './kingdoms';
import { PERSONALITIES } from '../data/personalities';

export interface Caravan {
  id: number;
  fromK: number;
  kcolor: string;
  x: number; y: number;
  px: number; py: number;
  tx: number; ty: number;
  value: number;
}

export interface CaravanHost {
  rng: RNG;
  world: World;
  kingdoms: KingdomSystem;
  hasCenter(): boolean;
  villageCenter(): { x: number; y: number };
  addGold(n: number): void;
  marketMult(): number;
  toast(msg: string, kind?: '' | 'good' | 'bad'): void;
}

export class CaravanSystem {
  caravans: Caravan[] = [];
  private acc = 0;
  private nextID = 1;

  constructor(private readonly host: CaravanHost) {}

  private spawn(kId: number): void {
    const k = this.host.kingdoms.byId(kId);
    if (!k) return;
    const c = this.host.villageCenter();
    this.caravans.push({
      id: this.nextID++,
      fromK: k.id, kcolor: k.color,
      x: k.cx + 0.5, y: k.cy + 0.5,
      px: k.cx + 0.5, py: k.cy + 0.5,
      tx: c.x + 0.5, ty: c.y + 0.5,
      value: Math.round(35 + k.tiles.size * 2.5) * this.host.marketMult(),
    });
  }

  tick(dt: number): void {
    const host = this.host;
    // yeni kervan gönder
    this.acc += dt;
    if (this.acc > 22) {
      this.acc = 0;
      const partners = host.kingdoms.kingdoms.filter(k => k.tradeDeal && k.status !== 'war');
      if (partners.length && this.caravans.length < 4 && host.hasCenter()) {
        this.spawn(partners[(host.rng() * partners.length) | 0].id);
      }
    }
    for (let i = this.caravans.length - 1; i >= 0; i--) {
      const cv = this.caravans[i];
      cv.px = cv.x; cv.py = cv.y;
      const dx = cv.tx - cv.x, dy = cv.ty - cv.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.4) {
        host.addGold(cv.value);
        host.toast(`🐪 Kervan ulaştı: +${Math.round(cv.value)} altın`, 'good');
        this.caravans.splice(i, 1);
        continue;
      }
      const sp = 2.2 * dt;
      cv.x += (dx / d) * Math.min(sp, d);
      cv.y += (dy / d) * Math.min(sp, d);
      // yağma riski: savaştaki saldırgan krallıkların topraklarından geçerken
      if (host.rng() < dt * 0.05) {
        const owner = host.kingdoms.ownerMap.get(
          host.world.idx(cv.x | 0, cv.y | 0),
        );
        if (owner && owner.status === 'war'
          && host.rng() < PERSONALITIES[owner.persKey].aggr * 0.5) {
          host.toast(`🏴‍☠️ ${owner.name} kervanını yağmaladı!`, 'bad');
          this.caravans.splice(i, 1);
        }
      }
    }
  }

  serialize(): unknown {
    return { caravans: this.caravans, acc: this.acc, nextID: this.nextID };
  }

  restore(data: unknown): void {
    const d = data as { caravans: Caravan[]; acc: number; nextID: number };
    this.caravans = d.caravans;
    this.acc = d.acc;
    this.nextID = d.nextID;
  }
}
