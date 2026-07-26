import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { BATTLE_TIME, RAM_COST } from '../core/military';
import { compTotal } from '../data/units';
import { completeAll, findLand } from './helpers';

/** Krallıklı, ordulu savaş köyü. */
function warVillage(seed = 42): { s: Sim; kId: number } {
  const w = new World(64, 64, seed);
  const s = new Sim(w);
  const p = findLand(w);
  s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
  completeAll(s);
  s.events.eventAcc = -1e9;
  s.player.res.food = 3000; s.player.res.wood = 500;
  s.player.res.stone = 500; s.player.res.gold = 500;
  s.player.storageCap = 5000;
  s.kingdoms.spawn(3);
  const k = s.kingdoms.kingdoms[0];
  // krallık büyümesini dondur — savaş matematiği sabit kalsın
  for (const kk of s.kingdoms.kingdoms) { kk.growAcc = -1e9; kk.expandAcc = -1e9; }
  return { s, kId: k.id };
}

/** Tüm ordular çözülene dek ilerlet. */
function settle(s: Sim, maxSec = 300): void {
  let guard = 0;
  while (s.military.armies.length > 0 && guard < maxSec * 10) {
    s.tick(0.1);
    guard++;
  }
  expect(s.military.armies.length).toBe(0);
}

describe('Faz 4 — savaş derinliği', () => {
  it('kısmi ordu gönderimi: seçilen kadar gider, kalan köyde kalır', () => {
    const { s, kId } = warVillage();
    s.player.units.spear = 10; s.player.units.archer = 6; s.player.units.cav = 4;
    const ok = s.applyCommand({
      kind: 'attack', kingdomId: kId,
      comp: { spear: 4, archer: 2, cav: 0 }, tactic: 'dengeli',
    });
    expect(ok).toBe(true);
    expect(s.player.units.spear).toBe(6);
    expect(s.player.units.archer).toBe(4);
    expect(s.player.units.cav).toBe(4);
    const a = s.military.armies[0];
    expect(a.size).toBe(6);
    expect(a.comp).toEqual({ spear: 4, archer: 2, cav: 0 });
    expect(a.tactic).toBe('dengeli');
  });

  it('eldekinden fazlası istenirse eldekiyle sınırlanır; sıfır seçim reddedilir', () => {
    const { s, kId } = warVillage();
    s.player.units.spear = 3;
    expect(s.applyCommand({
      kind: 'attack', kingdomId: kId, comp: { spear: 0, archer: 0, cav: 0 },
    })).toBe(false);
    expect(s.applyCommand({
      kind: 'attack', kingdomId: kId, comp: { spear: 999, archer: 5, cav: 5 },
    })).toBe(true);
    expect(s.military.armies[0].comp.spear).toBe(3);
    expect(s.player.units.spear).toBe(0);
  });

  it('geri çağırma: ordu köye döner, askerler ve komutan geri gelir', () => {
    const { s, kId } = warVillage();
    s.player.units.spear = 8;
    s.player.res.gold = 500; s.player.res.food = 3000;
    // komutan için kışla gerekli
    const c = s.villageCenter();
    outer:
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (s.canPlaceOn('barracks', c.x + dx, c.y + dy)) {
          s.applyCommand({ kind: 'place', building: 'barracks', x: c.x + dx, y: c.y + dy });
          break outer;
        }
      }
    }
    completeAll(s);
    s.applyCommand({ kind: 'recruitCommander' });
    expect(s.military.commanders.length).toBe(1);
    s.applyCommand({ kind: 'attack', kingdomId: kId });
    const a = s.military.armies[0];
    expect(s.military.commanders[0].busy).toBe(true);
    for (let i = 0; i < 20; i++) s.tick(0.1); // biraz yürüsün
    expect(s.applyCommand({ kind: 'recallArmy', armyId: a.id })).toBe(true);
    expect(a.returning).toBe(true);
    settle(s);
    expect(s.player.units.spear).toBe(8);       // asker kaybı yok
    expect(s.military.commanders[0].busy).toBe(false); // komutan serbest
  });

  it('dönen ordu geri çağrılamaz; olmayan ordu reddedilir', () => {
    const { s, kId } = warVillage();
    s.player.units.spear = 5;
    s.applyCommand({ kind: 'attack', kingdomId: kId });
    const a = s.military.armies[0];
    s.applyCommand({ kind: 'recallArmy', armyId: a.id });
    expect(s.applyCommand({ kind: 'recallArmy', armyId: a.id })).toBe(false);
    expect(s.applyCommand({ kind: 'recallArmy', armyId: 9999 })).toBe(false);
  });

  it('temkinli taktik bozgunda orduyu kurtarır, dengeli tam dağılır', () => {
    const run = (tactic: 'dengeli' | 'temkinli'): number => {
      const { s, kId } = warVillage(77);
      const k = s.kingdoms.byId(kId)!;
      k.army = 400; // ezici savunma → kesin bozgun
      s.player.units.spear = 6;
      s.applyCommand({ kind: 'attack', kingdomId: kId, tactic });
      settle(s);
      return compTotal(s.player.units);
    };
    expect(run('dengeli')).toBe(0);          // bozgun: herkes gitti
    expect(run('temkinli')).toBeGreaterThan(0); // çekilme: sağ kalan döndü
  });

  it('taktikli saldırı deterministik: aynı tohum+komutlar → aynı sonuç', () => {
    const run = (): string => {
      const { s, kId } = warVillage(123);
      s.player.units.spear = 12; s.player.units.archer = 6;
      s.applyCommand({
        kind: 'attack', kingdomId: kId,
        comp: { spear: 8, archer: 4, cav: 0 }, tactic: 'agresif',
      });
      settle(s);
      return JSON.stringify(s.snapshot());
    };
    expect(run()).toBe(run());
  });

  it('varışta savaş HEMEN çözülmez: meydan savaşı sürer, sonra sonuçlanır', () => {
    const { s, kId } = warVillage(31);
    s.player.units.spear = 8;
    const goldBefore = s.player.res.gold;
    s.applyCommand({ kind: 'attack', kingdomId: kId });
    // varışa dek ilerlet
    let guard = 0;
    while (guard < 3000 && s.military.armies[0] && s.military.armies[0].fighting === undefined) {
      s.tick(0.1); guard++;
    }
    const a = s.military.armies[0];
    expect(a).toBeDefined();
    expect(a.fighting).toBeGreaterThan(0);       // çarpışma sürüyor
    expect(a.fighting).toBeLessThanOrEqual(BATTLE_TIME);
    expect(s.player.res.gold).toBe(goldBefore);  // henüz ganimet yok
    // çarpışma sırasında geri çağrılamaz
    expect(s.applyCommand({ kind: 'recallArmy', armyId: a.id })).toBe(false);
    settle(s);
    expect(s.player.res.gold).toBeGreaterThan(goldBefore); // savaş çözüldü, ganimet geldi
  });

  it('çarpışmanın ORTASINDA kayıt: yükleyince aynı sonuca varır', () => {
    const { s, kId } = warVillage(31);
    s.player.units.spear = 8;
    s.applyCommand({ kind: 'attack', kingdomId: kId });
    let guard = 0;
    while (guard < 3000 && s.military.armies[0] && s.military.armies[0].fighting === undefined) {
      s.tick(0.1); guard++;
    }
    s.tick(0.1); // savaşın içinde biraz zaman
    const saved = JSON.parse(JSON.stringify(s.serialize())) as Record<string, unknown>;
    const s2 = Sim.restore(new World(64, 64, 31), saved);
    expect(s2.military.armies[0].fighting).toBeCloseTo(s.military.armies[0].fighting!, 5);
    settle(s); settle(s2);
    expect(JSON.stringify(s.snapshot())).toBe(JSON.stringify(s2.snapshot()));
  });

  it('koçbaşı: maliyeti öder, surlu hedefe karşı savaşı çevirir', () => {
    const run = (ram: boolean): { won: boolean; wood: number } => {
      const { s, kId } = warVillage(88);
      const k = s.kingdoms.byId(kId)!;
      // surlu büyük kale: 80+ karo → defWalls = 20 (tavan), savunan asker yok
      for (let i = 0; i < 90; i++) k.tiles.add(10000 + i);
      k.army = 0;
      s.player.units.spear = 5; // 5 mızrakçı ≈ 45 saldırı — sur 44'e yetmez ama 22'yi aşar
      s.player.res.wood = 500; s.player.res.plank = 100;
      const goldBefore = s.player.res.gold;
      expect(s.applyCommand({ kind: 'attack', kingdomId: kId, ram })).toBe(true);
      settle(s);
      return { won: s.player.res.gold > goldBefore, wood: s.player.res.wood };
    };
    const without = run(false);
    const withRam = run(true);
    expect(withRam.won).toBe(true);                 // koçbaşıyla surlar aşıldı
    expect(without.won).toBe(false);                // koçbaşısız surlar dayandı
    expect(withRam.wood).toBe(500 - (RAM_COST.wood ?? 0)); // maliyet ödendi
  });

  it('koçbaşı kaynak yoksa saldırı reddedilir', () => {
    const { s, kId } = warVillage();
    s.player.units.spear = 5;
    s.player.res.wood = 10; s.player.res.plank = 0;
    expect(s.applyCommand({ kind: 'attack', kingdomId: kId, ram: true })).toBe(false);
    expect(s.military.armies.length).toBe(0);
  });

  it('başarılı baskın binaları ateşe verir', () => {
    const { s } = warVillage(13);
    // savunmasız köy + birkaç bina
    const c = s.villageCenter();
    s.player.res.wood = 900; s.player.res.stone = 500; s.player.res.food = 3000;
    let placed = 0;
    for (let dy = -3; dy <= 3 && placed < 3; dy++) {
      for (let dx = -3; dx <= 3 && placed < 3; dx++) {
        if (!dx && !dy) continue;
        if (s.canPlaceOn('house', c.x + dx, c.y + dy)) {
          s.applyCommand({ kind: 'place', building: 'house', x: c.x + dx, y: c.y + dy });
          placed++;
        }
      }
    }
    completeAll(s);
    s.player.units.spear = 0; s.player.units.archer = 0; s.player.units.cav = 0;
    // dev barbar akını — kesin baskın
    expect(s.military.barbarianRaid()).toBe(true);
    s.military.armies[0].size = 200;
    s.military.armies[0].comp = { spear: 200, archer: 0, cav: 0 };
    settle(s);
    expect(s.player.buildings.some(b => b.burning)).toBe(true); // yangın çıktı
  });

  it('savaş ortasında kayıt: taktik ve geri çağırma durumu korunur', () => {
    const { s, kId } = warVillage(55);
    s.player.units.spear = 9;
    s.applyCommand({ kind: 'attack', kingdomId: kId, comp: { spear: 5, archer: 0, cav: 0 }, tactic: 'temkinli' });
    for (let i = 0; i < 15; i++) s.tick(0.1);
    // gerçek kayıt akışı gibi: JSON metninden geçir (nesne paylaşımı olmasın)
    const saved = JSON.parse(JSON.stringify(s.serialize())) as Record<string, unknown>;
    const w2 = new World(64, 64, 55);
    const s2 = Sim.restore(w2, saved);
    const a1 = s.military.armies[0], a2 = s2.military.armies[0];
    expect(a2.tactic).toBe('temkinli');
    expect(a2.comp).toEqual(a1.comp);
    // ikisi de aynı şekilde devam etmeli
    settle(s); settle(s2);
    expect(JSON.stringify(s.snapshot())).toBe(JSON.stringify(s2.snapshot()));
  });
});
