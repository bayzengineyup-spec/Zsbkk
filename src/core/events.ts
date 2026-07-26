/* ============================================================
   OLAY VE FELAKET SİSTEMİ — prototipten taşındı.
   Olaylar rastgele DEĞİL koşulludur — oyuncu önlem alabilir:
   taş bina oranı yangını, kalabalık vebayı, mutluluk isyanı belirler.
   NOT: Barbar akını ve kahraman olayı ordu/askeri sistemle (M4) gelecek.
   ============================================================ */
import type { RNG } from './rng';
import type { Building } from './sim';
import type { SeasonDef } from '../data/seasons';
import { BUILDINGS } from '../data/buildings';

export interface ActiveEffect {
  key: string;
  name: string;
  icon: string;
  timer: number;
  prodMult?: number;
  foodMult?: number;
}

/** Sim'in olay sistemine sunduğu arayüz (çevrimsel import yok). */
export interface EventHost {
  rng: RNG;
  buildings(): Building[];
  removeBuilding(b: Building): void;
  pop(): number;
  popCap(): number;
  idle(): number;
  happy(): number;
  addHappy(delta: number): void;
  hasCenter(): boolean;
  addPop(n: number): void;      // + göç / − isyan (köylü senkronu dahil)
  killVillager(): void;         // veba/açlık dışı tek can kaybı
  addRes(key: 'food' | 'wood' | 'stone' | 'gold', n: number): void;
  takeGold(n: number): void;
  season(): SeasonDef;
  year(): number;
  toast(msg: string, kind?: '' | 'good' | 'bad'): void;
  /** Barbar akını başlat (askeri sistem) — başarı durumu döner. */
  spawnBarbarians(): boolean;
  /** Kışla var mı (kahraman olayı şartı) */
  hasBarracks(): boolean;
  /** Orduya asker kat (kahraman olayı — mızrakçı olarak) */
  addSoldiers(n: number): void;
  /** Felaket risk çarpanı (sağlam yapı teknolojisi ile 0.5) */
  disasterMult(): number;
}

export class EventSystem {
  activeEffects: ActiveEffect[] = [];
  private eventAcc = 0;
  private plagueTimer = 0;

  constructor(private readonly host: EventHost) {}

  // ---------- etkiler ----------
  addEffect(key: string, name: string, icon: string, dur: number,
    data?: Partial<Pick<ActiveEffect, 'prodMult' | 'foodMult'>>): void {
    this.activeEffects = this.activeEffects.filter(e => e.key !== key);
    this.activeEffects.push({ key, name, icon, timer: dur, ...data });
  }

  hasEffect(key: string): boolean {
    return this.activeEffects.some(e => e.key === key);
  }

  effectMult(field: 'prodMult' | 'foodMult'): number {
    let m = 1;
    for (const e of this.activeEffects) {
      const v = e[field];
      if (v !== undefined) m *= v;
    }
    return m;
  }

  // ---------- risk hesapları ----------
  private woodenRatio(): number {
    const bs = this.host.buildings();
    if (!bs.length) return 0;
    const stony = bs.filter(b => ['wall', 'quarry', 'mine'].includes(b.type)).length;
    return 1 - stony / bs.length;
  }

  private crowding(): number {
    if (this.host.popCap() <= 0) return 0;
    return Math.min(1.5, this.host.pop() / this.host.popCap());
  }

  // ---------- felaketler ----------
  eventFire(): boolean {
    const flammable = this.host.buildings()
      .filter(b => !b.burning && b.type !== 'wall' && b.type !== 'quarry');
    if (!flammable.length) return false;
    const b = flammable[(this.host.rng() * flammable.length) | 0];
    b.burning = true;
    b.hp = b.hp ?? 100;
    this.host.toast(`🔥 YANGIN! ${BUILDINGS[b.type].name} alev aldı!`, 'bad');
    this.host.addHappy(-8);
    return true;
  }

  eventPlague(): boolean {
    if (this.host.pop() < 8) return false;
    this.addEffect('plague', 'Veba', '🦠', 45, { prodMult: 0.7 });
    this.host.toast('🦠 VEBA! Hastalık köyde yayılıyor.', 'bad');
    this.host.addHappy(-18);
    this.plagueTimer = 7; // ilk can 7 saniye sonra
    return true;
  }

  eventEarthquake(): boolean {
    const bs = this.host.buildings();
    if (!bs.length) return false;
    const n = Math.max(1, Math.floor(bs.length * 0.18));
    let destroyed = 0;
    for (let i = 0; i < n; i++) {
      const cand = this.host.buildings().filter(b => b.type !== 'center');
      if (!cand.length) break;
      const b = cand[(this.host.rng() * cand.length) | 0];
      this.host.removeBuilding(b);
      destroyed++;
    }
    this.host.toast(`🌍 DEPREM! ${destroyed} bina yıkıldı.`, 'bad');
    this.host.addHappy(-15);
    return destroyed > 0;
  }

  eventStorm(): boolean {
    const wooden = this.host.buildings()
      .filter(b => b.type !== 'wall' && b.type !== 'quarry' && b.type !== 'center');
    if (!wooden.length) return false;
    const b = wooden[(this.host.rng() * wooden.length) | 0];
    b.hp = (b.hp ?? 100) - 55;
    if (b.hp <= 0) {
      this.host.removeBuilding(b);
      this.host.toast(`🌪️ KASIRGA! ${BUILDINGS[b.type].name} uçtu.`, 'bad');
    } else {
      this.host.toast(`🌪️ KASIRGA! ${BUILDINGS[b.type].name} hasar aldı.`, 'bad');
    }
    return true;
  }

  eventHarshWinter(): boolean {
    this.addEffect('harsh', 'Sert Kış', '🥶', 60, { foodMult: 1.8, prodMult: 0.8 });
    this.host.toast('🥶 SERT KIŞ! Yiyecek tüketimi arttı.', 'bad');
    return true;
  }

  eventRebellion(): boolean {
    if (this.host.happy() > 25 || this.host.pop() < 5) return false;
    const loss = Math.max(1, Math.floor(this.host.pop() * 0.15));
    this.host.addPop(-loss);
    this.host.takeGold(40);
    this.addEffect('unrest', 'Huzursuzluk', '😠', 40, { prodMult: 0.6 });
    this.host.toast(`✊ İSYAN! ${loss} kişi köyü terk etti.`, 'bad');
    return true;
  }

  // ---------- iyi olaylar ----------
  eventGoldenAge(): boolean {
    this.addEffect('golden', 'Altın Çağ', '✨', 50, { prodMult: 1.6 });
    this.host.toast('✨ ALTIN ÇAĞ! Tüm üretim arttı.', 'good');
    this.host.addHappy(15);
    return true;
  }

  eventMigration(): boolean {
    const room = this.host.popCap() - this.host.pop();
    if (room <= 0) return false;
    const n = Math.min(room, 2 + ((this.host.rng() * 3) | 0));
    this.host.addPop(n);
    this.host.toast(`🚶 GÖÇ! ${n} kişi köyüne sığındı.`, 'good');
    return true;
  }

  eventCaravan(): boolean {
    const g = 40 + ((this.host.rng() * 60) | 0);
    const w = 30 + ((this.host.rng() * 50) | 0);
    this.host.addRes('gold', g);
    this.host.addRes('wood', w);
    this.host.toast(`🐪 Kayıp kervan buldun: +${g} altın, +${w} odun.`, 'good');
    return true;
  }

  eventHero(): boolean {
    if (!this.host.hasBarracks()) return false;
    const n = 4 + ((this.host.rng() * 4) | 0);
    this.host.addSoldiers(n);
    this.host.toast(`⭐ KAHRAMAN! ${n} savaşçı davana katıldı.`, 'good');
    this.host.addHappy(8);
    return true;
  }

  // ---------- olay seçici ----------
  tryRandomEvent(): void {
    if (!this.host.hasCenter()) return;
    const s = this.host.season();
    const pool: { w: number; fn: () => boolean }[] = [];
    const push = (w: number, fn: () => boolean) => { if (w > 0) pool.push({ w, fn }); };

    // felaketler — koşullu ağırlık
    push(this.woodenRatio() * s.fire * 2.2 * this.host.disasterMult(), () => this.eventFire());
    push(this.crowding() * 1.6 * (this.hasEffect('plague') ? 0 : 1), () => this.eventPlague());
    push(0.5 * this.host.disasterMult(), () => this.eventEarthquake());
    push(this.woodenRatio() * 1.0, () => this.eventStorm());
    push(s.key === 'kis' && !this.hasEffect('harsh') ? 2.2 : 0, () => this.eventHarshWinter());
    push(this.host.year() >= 1 ? 1.4 : 0, () => this.host.spawnBarbarians());
    push(this.host.happy() < 25 ? 3.0 : 0, () => this.eventRebellion());

    // iyi olaylar
    push(this.host.happy() > 60 ? 1.6 : 0.5, () => this.eventGoldenAge());
    push(this.host.popCap() > this.host.pop() ? 1.5 : 0, () => this.eventMigration());
    push(1.2, () => this.eventCaravan());
    push(this.host.hasBarracks() ? 1.0 : 0, () => this.eventHero());

    const total = pool.reduce((a, p) => a + p.w, 0);
    if (total <= 0) return;
    let r = this.host.rng() * total;
    for (const p of pool) {
      r -= p.w;
      if (r <= 0) { p.fn(); return; }
    }
  }

  // ---------- yangın yayılması ----------
  private updateFires(dt: number): void {
    const bs = this.host.buildings();
    const burning = bs.filter(b => b.burning);
    if (!burning.length) return;
    for (const b of burning) {
      b.hp = (b.hp ?? 100) - 14 * dt;
      // komşu binaya sıçrama
      if (this.host.rng() < 0.25 * dt) {
        for (const o of bs) {
          if (o.burning || o === b) continue;
          if (Math.abs(o.x - b.x) <= 1 && Math.abs(o.y - b.y) <= 1) {
            o.burning = true;
            o.hp = o.hp ?? 100;
            this.host.toast(`🔥 Yangın ${BUILDINGS[o.type].name} binasına sıçradı!`, 'bad');
            break;
          }
        }
      }
      if (b.hp <= 0) {
        const nm = BUILDINGS[b.type].name;
        this.host.removeBuilding(b);
        this.host.toast(`🔥 ${nm} kül oldu.`, 'bad');
        this.host.addHappy(-5);
      }
    }
  }

  /** Yangın söndürme: boşta köylüler kullanılır (komutla çağrılır). */
  extinguish(b: Building): boolean {
    if (!b.burning) return false;
    if (this.host.idle() <= 0) { this.host.toast('Söndürecek boşta köylü yok.', 'bad'); return false; }
    const chance = Math.min(0.9, 0.35 + this.host.idle() * 0.12);
    if (this.host.rng() < chance) {
      b.burning = false;
      this.host.toast('🪣 Yangın söndürüldü!', 'good');
      return true;
    }
    b.hp = (b.hp ?? 100) - 10;
    this.host.toast('🪣 Söndürme başarısız, alevler sürüyor.', 'bad');
    return false;
  }

  // ---------- ana döngü ----------
  tick(dt: number): void {
    if (!this.host.hasCenter()) return;

    // etki süreleri
    for (const e of this.activeEffects) e.timer -= dt;
    const expired = this.activeEffects.filter(e => e.timer <= 0);
    for (const e of expired) this.host.toast(`${e.icon} ${e.name} sona erdi.`);
    this.activeEffects = this.activeEffects.filter(e => e.timer > 0);

    this.updateFires(dt);

    // veba: süreli nüfus kaybı
    if (this.hasEffect('plague')) {
      this.plagueTimer -= dt;
      if (this.plagueTimer <= 0) {
        this.plagueTimer = 7;
        if (this.host.pop() > 3) {
          this.host.killVillager();
          this.host.toast('🦠 Veba bir can aldı.', 'bad');
        }
      }
    }

    // olay zamanlayıcı: ortalama 40 saniyede bir
    this.eventAcc += dt;
    if (this.eventAcc >= 40) {
      this.eventAcc = 0;
      if (this.host.rng() < 0.75) this.tryRandomEvent();
    }
  }

  // ---------- kayıt ----------
  serialize(): unknown {
    return {
      activeEffects: this.activeEffects,
      eventAcc: this.eventAcc,
      plagueTimer: this.plagueTimer,
    };
  }

  restore(data: unknown): void {
    const d = data as { activeEffects: ActiveEffect[]; eventAcc: number; plagueTimer: number };
    this.activeEffects = d.activeEffects;
    this.eventAcc = d.eventAcc;
    this.plagueTimer = d.plagueTimer;
  }
}
