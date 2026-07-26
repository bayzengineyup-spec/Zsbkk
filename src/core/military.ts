/* ============================================================
   ASKERİ SİSTEM — eğitim, ordu yürüyüşü, savaş (prototipten).
   Taş-kağıt-makas: Mızrakçı > Süvari > Okçu > Mızrakçı.
   Komutanlar: özellik + seviye; savaşta ölüm/esaret riski.
   ============================================================ */
import type { RNG } from './rng';
import type { World } from './world';
import type { KingdomSystem, Kingdom } from './kingdoms';
import type { TechSystem } from './tech';
import {
  UNITS, UNIT_KEYS, COUNTER_BONUS, AI_COMP,
  compTotal, compLabel, type UnitComp, type UnitKey,
} from '../data/units';
import { CMD_TRAITS, CMD_NAMES, type CmdTraitKey } from '../data/techs';
import type { Cost } from '../data/buildings';

export interface Army {
  id: number;
  owner: 'player' | 'barbar' | number; // number = krallık id
  x: number; y: number;
  px: number; py: number;   // interpolasyon
  tx: number; ty: number;
  size: number;
  comp: UnitComp;
  targetK: number | 'player' | null;
  returning: boolean;
  color: string;
  cmdId: number | null;
}

export interface Commander {
  id: number;
  name: string;
  level: number;
  xp: number;
  trait: CmdTraitKey;
  busy: boolean;
  captured: boolean;
}

/** Sim'in askeri sisteme sunduğu arayüz. */
export interface MilitaryHost {
  rng: RNG;
  world: World;
  kingdoms: KingdomSystem;
  tech: TechSystem;
  units(): UnitComp;
  res: Record<string, number>;
  storageCap(): number;
  idle(): number;
  takeIdle(): boolean;          // bir boşta köylüyü askere al (başarı)
  pop(): number;
  losePop(n: number): void;
  addHappy(d: number): void;
  defense(): number;
  buildingCount(): number;
  hasBarracks(): boolean;
  hasCenter(): boolean;
  villageCenter(): { x: number; y: number };
  canAfford(cost: Cost): boolean;
  pay(cost: Cost): void;
  changeReputation(delta: number, reason: string): void;
  year(): number;
  toast(msg: string, kind?: '' | 'good' | 'bad'): void;
}

export class MilitarySystem {
  armies: Army[] = [];
  commanders: Commander[] = [];
  private nextAID = 1;
  private nextCmdID = 1;

  constructor(private readonly host: MilitaryHost) {}

  // ---------- eğitim ----------
  train(type: UnitKey): boolean {
    const U = UNITS[type];
    const host = this.host;
    if (!host.hasBarracks()) { host.toast('Önce Kışla kur.', 'bad'); return false; }
    if (host.idle() <= 0) { host.toast('Boşta köylü yok — asker olacak kimse yok.', 'bad'); return false; }
    if (!host.canAfford(U.cost)) { host.toast(`${U.name} için kaynak yetersiz.`, 'bad'); return false; }
    host.pay(U.cost);
    if (!host.takeIdle()) return false;
    host.units()[type] += 1;
    host.toast(`${U.icon} ${U.name} eğitildi.`, 'good');
    return true;
  }

  // ---------- komutanlar ----------
  private makeCommander(): Commander {
    const keys = Object.keys(CMD_TRAITS) as CmdTraitKey[];
    return {
      id: this.nextCmdID++,
      name: CMD_NAMES[(this.host.rng() * CMD_NAMES.length) | 0],
      level: 1, xp: 0,
      trait: keys[(this.host.rng() * keys.length) | 0],
      busy: false, captured: false,
    };
  }

  recruitCommander(): boolean {
    const host = this.host;
    if (!host.hasBarracks()) { host.toast('Önce Kışla kur.', 'bad'); return false; }
    if (this.commanders.length >= 5) { host.toast('En fazla 5 komutan.', 'bad'); return false; }
    const cost: Cost = { gold: 120, food: 80 };
    if (!host.canAfford(cost)) { host.toast('Komutan için 🪙120 🍞80 gerekli.', 'bad'); return false; }
    host.pay(cost);
    const c = this.makeCommander();
    this.commanders.push(c);
    const t = CMD_TRAITS[c.trait];
    host.toast(`⭐ Komutan ${c.name} katıldı! ${t.icon} ${t.name}`, 'good');
    return true;
  }

  private cmdXpNeed(c: Commander): number { return 40 + c.level * 35; }

  cmdBonus(c: Commander | null, field: 'wall' | 'speed' | 'atk' | 'def' | 'loss'): number {
    if (!c) return 1;
    const t = CMD_TRAITS[c.trait];
    const base = t[field] ?? 1;
    return 1 + (base - 1) * (1 + (c.level - 1) * 0.15);
  }

  private gainCmdXp(c: Commander, amt: number): void {
    c.xp += amt * this.host.tech.xp();
    while (c.xp >= this.cmdXpNeed(c)) {
      c.xp -= this.cmdXpNeed(c);
      c.level++;
      this.host.toast(`⭐ ${c.name} seviye ${c.level} oldu!`, 'good');
    }
  }

  freeCommander(): Commander | null {
    return this.commanders.find(c => !c.busy && !c.captured) ?? null;
  }

  // ---------- ordu gönderme ----------
  sendArmy(target: Kingdom): boolean {
    const host = this.host;
    const units = host.units();
    if (compTotal(units) <= 0) { host.toast('Ordun yok.', 'bad'); return false; }
    const c = host.villageCenter();
    const comp: UnitComp = { spear: units.spear, archer: units.archer, cav: units.cav };
    const marchSize = compTotal(comp);
    units.spear = 0; units.archer = 0; units.cav = 0;
    const cmd = this.freeCommander();
    if (cmd) { cmd.busy = true; host.toast(`⭐ Komutan ${cmd.name} orduya önderlik ediyor.`); }
    this.armies.push({
      id: this.nextAID++, owner: 'player',
      x: c.x + 0.5, y: c.y + 0.5, px: c.x + 0.5, py: c.y + 0.5,
      tx: target.cx + 0.5, ty: target.cy + 0.5,
      size: marchSize, comp, targetK: target.id,
      returning: false, color: '#ffe9a8', cmdId: cmd ? cmd.id : null,
    });
    if (target.status === 'ally') host.changeReputation(-25, 'müttefikine saldırdın');
    target.status = 'war';
    target.tradeDeal = false;
    host.toast(`${marchSize} asker ${target.name} üzerine yürüyor! ⚔️`);
    return true;
  }

  /** AI ordu bileşimi: kişilik oranlarından. */
  kingdomComp(k: Kingdom): UnitComp {
    const w = AI_COMP[k.persKey] ?? AI_COMP.kaotik;
    const n = Math.max(0, Math.round(k.army));
    return {
      spear: Math.round(n * w.spear),
      archer: Math.round(n * w.archer),
      cav: Math.round(n * w.cav),
    };
  }

  kingdomAttacksPlayer(k: Kingdom): void {
    const host = this.host;
    if (!host.hasCenter()) return;
    const c = host.villageCenter();
    const size = Math.round(k.army);
    if (size < 3) return;
    k.army = 0;
    this.armies.push({
      id: this.nextAID++, owner: k.id,
      x: k.cx + 0.5, y: k.cy + 0.5, px: k.cx + 0.5, py: k.cy + 0.5,
      tx: c.x + 0.5, ty: c.y + 0.5,
      size, comp: this.kingdomComp(k), targetK: 'player',
      returning: false, color: k.color, cmdId: null,
    });
    host.toast(`⚔️ ${k.name} sana saldırı ordusu gönderdi! (${size} asker)`, 'bad');
    this.alliesRespondToAttack(k.id);
  }

  /** Barbar akını (olay sisteminden çağrılır). */
  barbarianRaid(): boolean {
    const host = this.host;
    if (!host.hasCenter()) return false;
    const w = host.world;
    const c = host.villageCenter();
    const edge = (host.rng() * 4) | 0;
    let sx: number, sy: number;
    if (edge === 0) { sx = 2; sy = (host.rng() * w.H) | 0; }
    else if (edge === 1) { sx = w.W - 3; sy = (host.rng() * w.H) | 0; }
    else if (edge === 2) { sx = (host.rng() * w.W) | 0; sy = 2; }
    else { sx = (host.rng() * w.W) | 0; sy = w.H - 3; }
    const size = 6 + Math.round(host.pop() * 0.4) + host.year() * 2;
    this.armies.push({
      id: this.nextAID++, owner: 'barbar',
      x: sx + 0.5, y: sy + 0.5, px: sx + 0.5, py: sy + 0.5,
      tx: c.x + 0.5, ty: c.y + 0.5,
      size, comp: { spear: size, archer: 0, cav: 0 }, targetK: 'player',
      returning: false, color: '#8b4a2a', cmdId: null,
    });
    host.toast(`🪓 BARBAR AKINI! ${size} barbar köyüne doğru geliyor!`, 'bad');
    return true;
  }

  /** Müttefikler savunmaya koşar. */
  private alliesRespondToAttack(attackerId: number): void {
    const host = this.host;
    for (const k of host.kingdoms.kingdoms) {
      if (k.status !== 'ally' || k.id === attackerId) continue;
      if (k.army < 4) continue;
      if (host.rng() < 0.55) {
        const help = Math.round(k.army * 0.6);
        k.army -= help;
        host.units().spear += help; // yardım piyade olarak katılır
        host.toast(`🛡️ Müttefikin ${k.name} savunmaya ${help} asker yolladı!`, 'good');
      }
    }
  }

  // ---------- savaş hesabı (prototipten birebir) ----------
  battleForces(
    attComp: UnitComp, defComp: UnitComp, defWalls: number, cmd: Commander | null,
  ): { atk: number; def: number } {
    const tech = this.host.tech;
    const aT = compTotal(attComp) || 1, dT = compTotal(defComp) || 1;
    let atk = 0, def = 0;
    for (const t of UNIT_KEYS) {
      const n = attComp[t]; if (!n) continue;
      const counterFrac = (defComp[UNITS[t].vs] ?? 0) / dT;
      let p = n * UNITS[t].atk * (1 + counterFrac * COUNTER_BONUS) * tech.unitAtk();
      if (t === 'cav') p *= tech.cav();
      if (t === 'cav' && defWalls > 0) p *= 0.62;   // süvari kuşatmada kötü
      if (defWalls > 0) p *= tech.siege() * this.cmdBonus(cmd, 'wall');
      atk += p * this.cmdBonus(cmd, 'atk');
    }
    for (const t of UNIT_KEYS) {
      const n = defComp[t]; if (!n) continue;
      const counterFrac = (attComp[UNITS[t].vs] ?? 0) / aT;
      def += n * UNITS[t].def * (1 + counterFrac * COUNTER_BONUS) * tech.unitDef();
    }
    def += defWalls * 2.2;
    return { atk, def };
  }

  private applyLosses(comp: UnitComp, fraction: number): UnitComp {
    const lost: UnitComp = { spear: 0, archer: 0, cav: 0 };
    for (const t of UNIT_KEYS) {
      const n = comp[t];
      const l = Math.min(n, Math.round(n * fraction));
      comp[t] = n - l;
      lost[t] = l;
    }
    return lost;
  }

  // ---------- ordu hareketi ----------
  tick(dt: number): void {
    for (let ai = this.armies.length - 1; ai >= 0; ai--) {
      const a = this.armies[ai];
      a.px = a.x; a.py = a.y;
      const dx = a.tx - a.x, dy = a.ty - a.y;
      const dist = Math.hypot(dx, dy);
      let speed = 3.5 * dt;
      if (a.cmdId !== null) {
        const cm = this.commanders.find(c => c.id === a.cmdId);
        if (cm) speed *= this.cmdBonus(cm, 'speed');
      }
      if (dist < 0.3) {
        if (a.returning) {
          const units = this.host.units();
          for (const t of UNIT_KEYS) units[t] += a.comp[t];
          this.armies.splice(ai, 1);
          continue;
        }
        this.resolveBattle(a);
        this.armies.splice(ai, 1);
      } else {
        a.x += (dx / dist) * Math.min(speed, dist);
        a.y += (dy / dist) * Math.min(speed, dist);
      }
    }
  }

  private resolveBattle(a: Army): void {
    const host = this.host;
    const atkComp = a.comp;

    if (a.owner === 'player') {
      // ---- oyuncu bir krallığa saldırıyor ----
      const k = host.kingdoms.byId(a.targetK as number);
      if (!k) return;
      const defComp = this.kingdomComp(k);
      const defWalls = Math.min(20, k.tiles.size * 0.25);
      const cmd = a.cmdId !== null
        ? this.commanders.find(c => c.id === a.cmdId) ?? null
        : null;
      const F = this.battleForces(atkComp, defComp, defWalls, cmd);
      const luck = 0.88 + host.rng() * 0.24;
      const attPower = F.atk * luck;

      if (attPower > F.def) {
        const ratio = F.def / Math.max(1, attPower);
        const lossM = cmd ? this.cmdBonus(cmd, 'loss') : 1;
        const lost = this.applyLosses(atkComp, Math.min(0.7, ratio * 0.65 * lossM));
        if (cmd) { cmd.busy = false; this.gainCmdXp(cmd, 30 + k.tiles.size); }
        const loot = Math.round(20 + k.tiles.size * 3);
        host.res.gold = Math.min(host.storageCap(), host.res.gold + loot);
        k.army = Math.max(0, k.army - a.size * 0.9);
        k.pop = Math.max(1, Math.round(k.pop * 0.6));
        host.kingdoms.shrink(k, Math.ceil(k.tiles.size * 0.3));
        k.relation = -100; k.status = 'war';
        host.toast(`🎉 ${k.name} yenildi! +${loot} altın. Kayıp: ${compLabel(lost)}`, 'good');
        if (k.tiles.size <= 1) host.kingdoms.destroy(k);
        if (compTotal(atkComp) > 0) this.returnArmy(a, atkComp);
      } else {
        const ratio = attPower / Math.max(1, F.def);
        this.applyLosses(atkComp, 1); // saldıran ordu dağılır
        k.army = Math.max(0, k.army - a.size * ratio * 0.5);
        k.relation = -100; k.status = 'war';
        host.toast(`💀 Ordun ${k.name} önünde bozguna uğradı. (${a.size} asker kayıp)`, 'bad');
        if (cmd) {
          cmd.busy = false;
          const roll = host.rng();
          if (roll < 0.22) {
            this.commanders = this.commanders.filter(c => c.id !== cmd.id);
            host.toast(`☠️ Komutan ${cmd.name} savaşta öldü.`, 'bad');
          } else if (roll < 0.40) {
            cmd.captured = true;
            host.toast(`⛓️ Komutan ${cmd.name} esir düştü.`, 'bad');
          } else {
            this.gainCmdXp(cmd, 10);
          }
        }
      }
    } else {
      // ---- krallık/barbar oyuncuya saldırıyor ----
      const defComp: UnitComp = { ...host.units() };
      const wallBonus = host.defense() + host.buildingCount() * 1.2 + 4;
      const F = this.battleForces(atkComp, defComp, wallBonus, null);
      const luck = 0.88 + host.rng() * 0.24;
      const attPower = F.atk * luck;

      if (attPower > F.def) {
        const ratio = F.def / Math.max(1, attPower);
        this.applyLosses(host.units(), Math.min(0.85, 0.55 + ratio * 0.3));
        const lootG = Math.min(host.res.gold, Math.round(a.size * 3));
        const lootF = Math.min(host.res.food, Math.round(a.size * 4));
        host.res.gold -= lootG;
        host.res.food -= lootF;
        const popLoss = Math.min(Math.max(0, host.pop() - 1), Math.ceil(a.size * 0.3));
        host.losePop(popLoss);
        host.addHappy(-20);
        host.toast(`💀 Baskın! ${lootG} altın, ${lootF} yiyecek yağmalandı, ${popLoss} can gitti.`, 'bad');
      } else {
        const ratio = attPower / Math.max(1, F.def);
        const lost = this.applyLosses(host.units(), Math.min(0.6, ratio * 0.45));
        host.toast(
          (a.owner === 'barbar' ? '🛡️ Barbarları püskürttün!' : '🛡️ Baskını püskürttün!')
          + (compTotal(lost) > 0 ? ` Kayıp: ${compLabel(lost)}` : ' Kayıpsız!'),
          'good',
        );
      }
    }
  }

  /** Hayatta kalan ordu bileşimiyle köye döner. */
  private returnArmy(a: Army, comp: UnitComp): void {
    const c = this.host.villageCenter();
    this.armies.push({
      id: this.nextAID++, owner: 'player',
      x: a.x, y: a.y, px: a.x, py: a.y,
      tx: c.x + 0.5, ty: c.y + 0.5,
      size: compTotal(comp), comp: { ...comp }, targetK: null,
      returning: true, color: '#9fe09f', cmdId: null,
    });
  }

  // ---------- kayıt ----------
  serialize(): unknown {
    return {
      armies: this.armies,
      commanders: this.commanders,
      nextAID: this.nextAID,
      nextCmdID: this.nextCmdID,
    };
  }

  restore(data: unknown): void {
    const d = data as {
      armies: Army[]; commanders: Commander[]; nextAID: number; nextCmdID: number;
    };
    this.armies = d.armies;
    this.commanders = d.commanders;
    this.nextAID = d.nextAID;
    this.nextCmdID = d.nextCmdID;
  }
}
