/* ============================================================
   AI KRALLIKLAR + DİPLOMASİ — prototipten taşındı.
   Kişilikli, kendi kendine büyüyen rakipler; performans için
   sadeleştirilmiş ekonomi (toplu, tek tek değil).
   Durumlar: war → (hostile) → neutral → (friend) → ally, truce.
   NOT: Ordu/saldırı mekaniği M4'te (askeri sistemle) gelecek;
   burada ilişki/genişleme/diplomasi tam çalışır.
   ============================================================ */
import type { RNG } from './rng';
import type { World } from './world';
import { isWater } from '../data/biomes';
import {
  PERSONALITIES, DIPLO_BASE, KINGDOM_NAMES,
  type PersonalityKey, type Personality,
} from '../data/personalities';

export type KingdomStatus = 'neutral' | 'ally' | 'truce' | 'war';

export interface Kingdom {
  id: number;
  name: string;
  persKey: PersonalityKey;
  color: string;
  cx: number;
  cy: number;
  tiles: Set<number>;
  pop: number;
  army: number;
  power: number;
  growAcc: number;
  expandAcc: number;
  relation: number;   // -100..100
  trust: number;
  lastEnvoy: number;
  status: KingdomStatus;
  truceTimer: number;
  tradeDeal: boolean;
  spied: boolean;
  plotting: boolean;
  allyGiftAcc: number;
  betrayAcc: number;
}

/** Sim'in krallık sistemine sunduğu arayüz (çevrimsel import yok). */
export interface KingdomHost {
  world: World;
  rng: RNG;
  playerRes: Record<string, number>;
  playerStorageCap(): number;
  playerHasCenter(): boolean;
  playerPower(): number;
  reputation(): number;
  changeReputation(delta: number, reason: string): void;
  villageCenter(): { x: number; y: number };
  revealCircle(x: number, y: number, r: number): void;
  isTileVisible(i: number): boolean;
  toast(msg: string, kind?: '' | 'good' | 'bad'): void;
  /** Krallık oyuncuya saldırı ordusu yollar (askeri sistem). */
  attackPlayer(k: Kingdom): void;
  /** Teknoloji çarpanları */
  techDiplo(): number;
  techTrade(): number;
  spyCost(): number;
  spyAlwaysSucceeds(): boolean;
}

export type DiploAction =
  | 'gift' | 'trade' | 'ally' | 'truce' | 'tribute' | 'spy' | 'war' | 'breakAlly';

export function statusLabel(k: Kingdom): { t: string; c: string } {
  if (k.status === 'ally') return { t: 'İttifak 🤝', c: '#6aa84f' };
  if (k.status === 'truce') return { t: 'Ateşkes 🕊️', c: '#7fb3d5' };
  if (k.status === 'war') return { t: 'SAVAŞ ⚔️', c: '#c0503a' };
  if (k.relation > 40) return { t: 'Dost', c: '#9ccc7a' };
  if (k.relation < -40) return { t: 'Gergin ⚠️', c: '#e08a5a' };
  return { t: 'Tarafsız', c: '#a99878' };
}

export class KingdomSystem {
  kingdoms: Kingdom[] = [];
  /** Krallıklar hiç doğdu mu — fetih zaferi ancak o zaman geçerli. */
  everSpawned = false;
  private nextKID = 1;
  private aiWarAcc = 0;
  /** karo → krallık (render + kervan/yağma için) */
  ownerMap = new Map<number, Kingdom>();

  constructor(private readonly host: KingdomHost) {}

  personality(k: Kingdom): Personality { return PERSONALITIES[k.persKey]; }

  byId(id: number): Kingdom | null {
    return this.kingdoms.find(k => k.id === id) ?? null;
  }

  // ---------- kuruluş ----------
  private makeKingdom(cx: number, cy: number, persKey: PersonalityKey): Kingdom {
    const { rng, world } = this.host;
    return {
      id: this.nextKID++,
      name: KINGDOM_NAMES[(rng() * KINGDOM_NAMES.length) | 0] + ' Krallığı',
      persKey,
      color: PERSONALITIES[persKey].color,
      cx, cy,
      tiles: new Set([cy * world.W + cx]),
      pop: 8 + ((rng() * 6) | 0),
      army: 0, power: 10,
      growAcc: 0, expandAcc: 0,
      relation: 0, trust: 0, lastEnvoy: 0,
      status: 'neutral', truceTimer: 0, tradeDeal: false,
      spied: false, plotting: false, allyGiftAcc: 0, betrayAcc: 0,
    };
  }

  spawn(count: number): void {
    const { rng, world } = this.host;
    this.kingdoms = [];
    this.nextKID = 1;
    const persKeys = Object.keys(PERSONALITIES) as PersonalityKey[];
    const spots: { x: number; y: number }[] = [];
    let tries = 0;
    while (spots.length < count && tries < 3000) {
      tries++;
      const x = 4 + ((rng() * (world.W - 8)) | 0);
      const y = 4 + ((rng() * (world.H - 8)) | 0);
      const b = world.tiles[world.idx(x, y)];
      if (isWater(b) || b === 'peak' || b === 'mountain') continue;
      if (spots.some(s => Math.hypot(x - s.x, y - s.y) < world.W * 0.15)) continue;
      spots.push({ x, y });
    }
    for (const s of spots) {
      const pk = persKeys[(rng() * persKeys.length) | 0];
      this.kingdoms.push(this.makeKingdom(s.x, s.y, pk));
    }
    if (this.kingdoms.length > 0) this.everSpawned = true;
    this.rebuildOwnerMap();
  }

  rebuildOwnerMap(): void {
    this.ownerMap.clear();
    for (const k of this.kingdoms) for (const t of k.tiles) this.ownerMap.set(t, k);
  }

  ownerOfTile(i: number): Kingdom | null {
    return this.ownerMap.get(i) ?? null;
  }

  // ---------- büyüme / genişleme ----------
  private expandKingdom(k: Kingdom): void {
    const w = this.host.world;
    const candidates: number[] = [];
    for (const t of k.tiles) {
      const x = t % w.W, y = (t / w.W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (!w.inBounds(nx, ny)) continue;
        const ni = ny * w.W + nx;
        if (k.tiles.has(ni)) continue;
        const b = w.tiles[ni];
        if (isWater(b) || b === 'peak') continue;
        if (this.ownerMap.has(ni)) continue;
        candidates.push(ni);
      }
    }
    if (candidates.length) {
      const ni = candidates[(this.host.rng() * candidates.length) | 0];
      k.tiles.add(ni);
      this.ownerMap.set(ni, k);
    }
  }

  shrink(k: Kingdom, n: number): void {
    const w = this.host.world;
    const arr = [...k.tiles];
    arr.sort((a, b) => {
      const ax = a % w.W, ay = (a / w.W) | 0, bx = b % w.W, by = (b / w.W) | 0;
      return Math.hypot(bx - k.cx, by - k.cy) - Math.hypot(ax - k.cx, ay - k.cy);
    });
    for (let i = 0; i < n && k.tiles.size > 1; i++) {
      k.tiles.delete(arr[i]);
      this.ownerMap.delete(arr[i]);
    }
  }

  destroy(k: Kingdom): void {
    this.kingdoms = this.kingdoms.filter(kk => kk.id !== k.id);
    for (const t of k.tiles) this.ownerMap.delete(t);
    this.host.toast(`👑 ${k.name} haritadan silindi!`, 'good');
  }

  // ---------- tick ----------
  tick(dt: number): void {
    const host = this.host;
    const rng = host.rng;

    for (const k of this.kingdoms) {
      // büyüme
      k.growAcc += dt;
      if (k.growAcc >= 3) {
        k.growAcc = 0;
        const pers = PERSONALITIES[k.persKey];
        k.pop += 1 + ((pers.expand * 2) | 0);
        k.army += pers.aggr * 1.5;
        k.power = Math.round(k.pop * 0.5 + k.army * 2 + k.tiles.size * 1.5);
      }
      // genişleme
      const pers = PERSONALITIES[k.persKey];
      k.expandAcc += dt * pers.expand;
      if (k.expandAcc >= 4 && k.tiles.size < 80) {
        k.expandAcc = 0;
        this.expandKingdom(k);
      }
      // elçi
      k.lastEnvoy += dt;
      if (host.playerHasCenter() && k.lastEnvoy > 25 && rng() < pers.trade * 0.02) {
        k.lastEnvoy = 0;
        this.envoyEvent(k);
      }
      // güçlü saldırganın baskısı
      if (host.playerHasCenter() && pers.aggr > 0.6 && k.power > host.playerPower() * 1.3) {
        k.relation -= dt * pers.aggr * 0.4;
        if (k.relation < -60 && rng() < 0.003) {
          k.relation = -50;
          host.toast(`⚔️ ${k.name} sınırında asker yığıyor!`, 'bad');
        }
      }
      // saldırı kararı (prototip: maybeKingdomAttack)
      if (host.playerHasCenter() && k.status !== 'truce' && k.status !== 'ally'
        && k.relation < -55 && k.army > 5 && k.power > host.playerPower()
        && rng() < pers.aggr * dt * 0.05) {
        host.attackPlayer(k);
      }
      // --- pasif diplomasi ---
      // ateşkes sayacı
      if (k.status === 'truce') {
        k.truceTimer -= dt;
        if (k.truceTimer <= 0) {
          k.status = 'neutral';
          host.toast(`🕊️ ${k.name} ile ateşkes sona erdi.`);
        }
      }
      // ticaret geliri (pazar ağı teknolojisi geliri artırır)
      if (k.tradeDeal && k.status !== 'war') {
        host.playerRes.gold = Math.min(
          host.playerStorageCap(),
          host.playerRes.gold + 0.35 * dt * host.techTrade(),
        );
        k.relation = Math.min(100, k.relation + dt * 0.4);
      }
      // müttefik hediyesi + sinsi ihaneti
      if (k.status === 'ally') {
        k.allyGiftAcc += dt;
        if (k.allyGiftAcc > 55) {
          k.allyGiftAcc = 0;
          const g = 25 + (k.tiles.size | 0);
          host.playerRes.gold = Math.min(host.playerStorageCap(), host.playerRes.gold + g);
          host.toast(`🎁 Müttefikin ${k.name} sana ${g} altın yolladı.`, 'good');
        }
        if (k.plotting && host.playerPower() < k.power * 0.75) {
          k.betrayAcc += dt;
          if (k.betrayAcc > 12 && rng() < 0.02) {
            k.status = 'war'; k.relation = -100; k.plotting = false; k.tradeDeal = false;
            host.toast(`🐍 İHANET! ${k.name} ittifakı bozup sana saldırıyor!`, 'bad');
            host.attackPlayer(k);
          }
        }
      }
      // doğal ilişki kayması: barışçıl ısınır, fatih soğur
      const drift = (pers.trade - pers.aggr) * 0.06 * dt;
      if (k.status !== 'war') {
        k.relation = Math.max(-100, Math.min(100, k.relation + drift));
      }
    }

    this.updateAIWars(dt);
  }

  private envoyEvent(k: Kingdom): void {
    const p = PERSONALITIES[k.persKey];
    if (p.trade > 0.6) this.host.toast(`🤝 ${k.name} (${p.name}) ticaret teklif ediyor.`, 'good');
    else if (k.persKey === 'sinsi') this.host.toast(`🎁 ${k.name} sana hediye yolladı… ne için acaba?`);
    else this.host.toast(`📜 ${k.name} bir elçi gönderdi.`);
    k.relation = Math.min(100, k.relation + 10);
  }

  /** AI krallıklar birbirleriyle savaşır (harita canlı kalsın). */
  private updateAIWars(dt: number): void {
    this.aiWarAcc += dt;
    if (this.aiWarAcc < 25) return;
    this.aiWarAcc = 0;
    if (this.kingdoms.length < 2) return;
    const rng = this.host.rng;
    const a = this.kingdoms[(rng() * this.kingdoms.length) | 0];
    const b = this.kingdoms[(rng() * this.kingdoms.length) | 0];
    if (a.id === b.id) return;
    if (rng() > PERSONALITIES[a.persKey].aggr * 0.5) return;
    const aP = a.power * (0.85 + rng() * 0.3);
    const bP = b.power * (0.85 + rng() * 0.3);
    const w = this.host.world;
    const seen = this.host.isTileVisible(a.cy * w.W + a.cx)
      || this.host.isTileVisible(b.cy * w.W + b.cx);
    if (aP > bP) {
      this.shrink(b, Math.max(1, Math.ceil(b.tiles.size * 0.18)));
      b.army = Math.max(0, b.army * 0.5);
      a.army = Math.max(0, a.army * 0.8);
      a.pop += 4;
      if (seen) this.host.toast(`⚔️ ${a.name}, ${b.name} topraklarını ele geçirdi.`);
      if (b.tiles.size <= 1) this.destroy(b);
    } else {
      this.shrink(a, Math.max(1, Math.ceil(a.tiles.size * 0.12)));
      a.army = Math.max(0, a.army * 0.5);
      if (seen) this.host.toast(`🛡️ ${b.name}, ${a.name} saldırısını püskürttü.`);
      if (a.tiles.size <= 1) this.destroy(a);
    }
  }

  // ---------- oyuncu eylemleri ----------
  private acceptChance(k: Kingdom, kind: 'ally' | 'trade' | 'truce'): number {
    const base = DIPLO_BASE[k.persKey][kind] ?? 0.3;
    const relBonus = k.relation >= 0 ? (k.relation / 100) * 0.35 : (k.relation / 100) * 0.9;
    const repBonus = ((this.host.reputation() - 50) / 100) * 0.35;
    const powerGap = (this.host.playerPower() - k.power) / Math.max(20, k.power);
    const powerBonus = Math.max(-0.25, Math.min(0.25, powerGap * 0.2));
    return Math.max(0.02, Math.min(0.95, base + relBonus + repBonus + powerBonus));
  }

  applyAction(kingdomId: number, action: DiploAction): boolean {
    const k = this.byId(kingdomId);
    if (!k) return false;
    const host = this.host;
    const rng = host.rng;

    switch (action) {
      case 'gift': {
        const cost = 50;
        if (host.playerRes.gold < cost) { host.toast(`Hediye için 🪙${cost} gerekli.`, 'bad'); return false; }
        host.playerRes.gold -= cost;
        const gain = Math.round(14 * DIPLO_BASE[k.persKey].gift * host.techDiplo());
        k.relation = Math.min(100, k.relation + gain);
        k.trust = Math.min(100, k.trust + 6);
        host.changeReputation(2, '');
        host.toast(`🎁 ${k.name} hediyeni kabul etti. (+${gain} ilişki)`, 'good');
        return true;
      }
      case 'trade': {
        if (k.tradeDeal) { host.toast('Zaten ticaret anlaşmanız var.', 'bad'); return false; }
        if (k.status === 'war') { host.toast('Savaş hâlindeyken ticaret olmaz.', 'bad'); return false; }
        if (k.relation < 20) { host.toast(`${k.name} bu kadar mesafeliyken ticareti düşünmüyor.`, 'bad'); return false; }
        if (rng() < this.acceptChance(k, 'trade')) {
          k.tradeDeal = true;
          k.relation = Math.min(100, k.relation + 10);
          host.toast(`🤝 ${k.name} ile ticaret anlaşması kuruldu! Altın akışı başladı.`, 'good');
          return true;
        }
        k.relation = Math.max(-100, k.relation - 3);
        host.toast(`❌ ${k.name} ticaret teklifini reddetti.`, 'bad');
        return false;
      }
      case 'ally': {
        if (k.status === 'ally') { host.toast('Zaten müttefikiniz.', 'bad'); return false; }
        if (k.status === 'war') { host.toast('Önce ateşkes yapmalısın.', 'bad'); return false; }
        if (k.relation < 45) { host.toast(`${k.name} ittifak için yeterince güvenmiyor. (ilişki 45+ gerekli)`, 'bad'); return false; }
        if (rng() < this.acceptChance(k, 'ally')) {
          k.status = 'ally';
          k.relation = Math.min(100, k.relation + 20);
          if (k.persKey === 'sinsi') k.plotting = true;
          host.toast(`🤝 ${k.name} ile İTTİFAK kuruldu!`, 'good');
          host.changeReputation(3, '');
          return true;
        }
        k.relation = Math.max(-100, k.relation - 5);
        host.toast(`❌ ${k.name} ittifakı reddetti.`, 'bad');
        return false;
      }
      case 'truce': {
        if (k.status !== 'war') { host.toast('Savaş hâlinde değilsiniz.', 'bad'); return false; }
        if (rng() < this.acceptChance(k, 'truce')) {
          k.status = 'truce';
          k.truceTimer = 90;
          k.relation = Math.min(100, k.relation + 25);
          host.toast(`🕊️ ${k.name} ateşkesi kabul etti. (90sn)`, 'good');
          return true;
        }
        host.toast(`❌ ${k.name} ateşkesi reddetti — savaş sürüyor.`, 'bad');
        return false;
      }
      case 'tribute': {
        if (host.playerPower() < k.power * 1.4) {
          host.toast('Haraç istemek için çok daha güçlü olmalısın.', 'bad');
          return false;
        }
        const pay = Math.round(30 + k.tiles.size * 4);
        const resistance = PERSONALITIES[k.persKey].aggr * 0.5 + (k.persKey === 'inzivaci' ? 0.3 : 0);
        if (rng() > resistance) {
          host.playerRes.gold = Math.min(host.playerStorageCap(), host.playerRes.gold + pay);
          k.relation = Math.max(-100, k.relation - 30);
          host.toast(`💰 ${k.name} boyun eğdi: ${pay} altın haraç aldın.`, 'good');
          host.changeReputation(-6, 'zorbalık');
          return true;
        }
        k.relation = -100;
        k.status = 'war';
        host.toast(`⚔️ ${k.name} haracı reddetti ve savaş ilan etti!`, 'bad');
        host.changeReputation(-8, 'zorbalık');
        return false;
      }
      case 'spy': {
        const cost = host.spyCost();
        if (host.playerRes.gold < cost) { host.toast(`Casus için 🪙${cost} gerekli.`, 'bad'); return false; }
        host.playerRes.gold -= cost;
        if (host.spyAlwaysSucceeds() || rng() < 0.75) {
          k.spied = true;
          host.revealCircle(k.cx, k.cy, 12);
          host.toast(`🕵️ Casus başarılı: ${k.name} hakkında bilgi topladın.`, 'good');
          return true;
        }
        k.relation = Math.max(-100, k.relation - 25);
        host.toast(`🚨 Casusun yakalandı! ${k.name} öfkeli.`, 'bad');
        host.changeReputation(-5, 'casusluk');
        return false;
      }
      case 'war': {
        const wasAlly = k.status === 'ally';
        k.status = 'war';
        k.relation = -100;
        k.tradeDeal = false;
        if (wasAlly) {
          host.changeReputation(-25, 'ittifakı bozdun');
          host.toast(`⚔️ ${k.name} ile İTTİFAKI BOZDUN! Herkes bunu gördü.`, 'bad');
        } else {
          host.changeReputation(-12, 'savaş ilan ettin');
          host.toast(`⚔️ ${k.name} ile savaş ilan edildi.`, 'bad');
        }
        return true;
      }
      case 'breakAlly': {
        if (k.status !== 'ally') return false;
        k.status = 'neutral';
        k.relation = Math.max(-100, k.relation - 50);
        k.tradeDeal = false;
        host.changeReputation(-25, 'ittifakı bozdun');
        host.toast(`💔 ${k.name} ile ittifak bozuldu.`, 'bad');
        return true;
      }
    }
  }

  // ---------- kayıt ----------
  serialize(): unknown {
    return {
      nextKID: this.nextKID,
      aiWarAcc: this.aiWarAcc,
      everSpawned: this.everSpawned,
      kingdoms: this.kingdoms.map(k => ({ ...k, tiles: [...k.tiles] })),
    };
  }

  restore(data: unknown): void {
    const d = data as {
      nextKID: number; aiWarAcc: number; everSpawned?: boolean;
      kingdoms: (Omit<Kingdom, 'tiles'> & { tiles: number[] })[];
    };
    this.nextKID = d.nextKID;
    this.aiWarAcc = d.aiWarAcc;
    this.everSpawned = d.everSpawned ?? d.kingdoms.length > 0;
    this.kingdoms = d.kingdoms.map(k => ({ ...k, tiles: new Set(k.tiles) }));
    this.rebuildOwnerMap();
  }
}
