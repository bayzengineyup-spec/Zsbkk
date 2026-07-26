/* ============================================================
   TEKNOLOJİ SİSTEMİ — prototipten taşındı.
   Akademi bilgi (📜) üretir → teknoloji araştırılır → kalıcı çarpanlar.
   ============================================================ */
import { TECHS, type TechId } from '../data/techs';
import type { Cost, ResKey, BuildingType } from '../data/buildings';

/** Sim'in teknoloji sistemine sunduğu arayüz. */
export interface TechHost {
  res: Record<ResKey, number>;
  hasAcademy(): boolean;
  recalcCaps(): void;
  toast(msg: string, kind?: '' | 'good' | 'bad'): void;
}

export class TechSystem {
  done: Partial<Record<TechId, 1>> = {};

  constructor(private readonly host: TechHost) {}

  has(id: TechId): boolean { return this.done[id] === 1; }

  available(id: TechId): boolean {
    if (this.has(id)) return false;
    const t = TECHS[id];
    return !t.req || this.has(t.req);
  }

  research(id: TechId): boolean {
    const t = TECHS[id];
    if (!t || this.has(id)) return false;
    if (!this.available(id)) {
      this.host.toast(`Önce ${TECHS[t.req!].name} gerekli.`, 'bad');
      return false;
    }
    if (!this.host.hasAcademy()) { this.host.toast('Önce Akademi kur.', 'bad'); return false; }
    const c = t.cost;
    for (const k of Object.keys(c) as ResKey[]) {
      if (this.host.res[k] < (c[k] ?? 0)) {
        this.host.toast(k === 'know' ? 'Yeterli 📜 bilgi yok.' : 'Yeterli kaynak yok.', 'bad');
        return false;
      }
    }
    for (const k of Object.keys(c) as ResKey[]) this.host.res[k] -= c[k] ?? 0;
    this.done[id] = 1;
    this.host.recalcCaps();
    this.host.toast(`${t.icon} ${t.name} araştırıldı! ${t.desc}`, 'good');
    return true;
  }

  // ---------- çarpanlar (prototipten birebir) ----------
  prodMult(resKey: ResKey, bType: BuildingType): number {
    let m = 1;
    if (bType === 'farm' && this.has('plow')) m *= 1.30;
    if (bType === 'woodcutter' && this.has('sawmill')) m *= 1.30;
    if ((bType === 'quarry' || bType === 'mine') && this.has('deepdig')) m *= 1.35;
    return m;
  }

  unitAtk(): number { return this.has('ironw') ? 1.18 : 1; }
  unitDef(): number { return this.has('armor') ? 1.18 : 1; }
  siege(): number { return this.has('siege') ? 1.60 : 1; }
  cav(): number { return this.has('cavtr') ? 1.30 : 1; }
  costMult(): number { return this.has('masonry') ? 0.80 : 1; }
  disaster(): number { return this.has('sturdy') ? 0.50 : 1; }
  storage(): number { return this.has('granary') ? 1.60 : 1; }
  housing(): number { return this.has('housing') ? 3 : 0; }
  happy(): number { return this.has('rites') ? 12 : 0; }
  diplo(): number { return this.has('diplo') ? 1.60 : 1; }
  trade(): number { return this.has('market') ? 1.60 : 1; }
  xp(): number { return this.has('legend') ? 2 : 1; }
  spyAlways(): boolean { return this.has('spynet'); }
  spyCost(): number { return this.has('spynet') ? 20 : 40; }

  /** Maliyeti taş ustalığı indirimli hesapla. */
  scaledCost(cost: Cost): Cost {
    const m = this.costMult();
    if (m === 1) return cost;
    const o: Cost = {};
    for (const k of Object.keys(cost) as ResKey[]) o[k] = Math.ceil((cost[k] ?? 0) * m);
    return o;
  }

  serialize(): unknown { return { done: this.done }; }
  restore(data: unknown): void {
    this.done = (data as { done: Partial<Record<TechId, 1>> }).done;
  }
}
