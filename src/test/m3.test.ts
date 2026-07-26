import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { isWater } from '../data/biomes';
import { completeAll } from './helpers';

function findLand(w: World): { x: number; y: number } {
  for (let y = 12; y < w.H - 12; y++) {
    for (let x = 12; x < w.W - 12; x++) {
      if (!isWater(w.tiles[w.idx(x, y)])) return { x, y };
    }
  }
  throw new Error('kara bulunamadı');
}

function simWithVillage(seed = 42): { w: World; s: Sim; p: { x: number; y: number } } {
  const w = new World(64, 64, seed);
  const s = new Sim(w);
  const p = findLand(w);
  s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
  completeAll(s);
  return { w, s, p };
}

describe('M3 — Olay sistemi', () => {
  it('yangın çıkar, üretimi durdurur, zamanla binayı yok eder', () => {
    const { s, p } = simWithVillage();
    s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
    completeAll(s);
    expect(s.events.eventFire()).toBe(true);
    const burning = s.player.buildings.find(b => b.burning);
    expect(burning).toBeDefined();
    // yangın ~8 sn'de 100 hp'yi bitirir (14/sn) → 12 sn sonra bina gitmiş olmalı
    const before = s.player.buildings.length;
    for (let i = 0; i < 120; i++) s.tick(0.1);
    expect(s.player.buildings.length).toBeLessThan(before);
  });

  it('sert kış yiyecek tüketimini artırır (foodMult etkisi)', () => {
    const { s } = simWithVillage();
    expect(s.events.effectMult('foodMult')).toBe(1);
    s.events.eventHarshWinter();
    expect(s.events.effectMult('foodMult')).toBe(1.8);
    expect(s.events.hasEffect('harsh')).toBe(true);
  });

  it('etkiler süre dolunca kalkar', () => {
    const { s } = simWithVillage();
    s.events.addEffect('test', 'Test', '⭐', 2, { prodMult: 2 });
    for (let i = 0; i < 30; i++) s.tick(0.1); // 3 sn
    expect(s.events.hasEffect('test')).toBe(false);
  });

  it('veba nüfus kaybettirir', () => {
    const { s } = simWithVillage();
    s.player.pop = 12; s.player.idle = 12;
    s.player.popCap = 12; // kapasite dolu → doğum olmaz, yalnız veba ölümleri sayılır
    s.syncVillagers();
    s.player.res.food = 400;
    expect(s.events.eventPlague()).toBe(true);
    const before = s.player.pop;
    for (let i = 0; i < 200; i++) s.tick(0.1); // 20 sn — 2+ can
    expect(s.player.pop).toBeLessThan(before);
  });

  it('göç boş kapasite yoksa gerçekleşmez', () => {
    const { s } = simWithVillage();
    s.player.pop = s.player.popCap;
    expect(s.events.eventMigration()).toBe(false);
  });
});

describe('M3 — Krallıklar & diplomasi', () => {
  function withKingdoms(seed = 42) {
    const r = simWithVillage(seed);
    r.s.kingdoms.spawn(5);
    return r;
  }

  it('krallıklar doğar ve zamanla büyür/genişler', () => {
    const { s } = withKingdoms();
    expect(s.kingdoms.kingdoms.length).toBeGreaterThan(0);
    const k = s.kingdoms.kingdoms[0];
    const tilesBefore = k.tiles.size, popBefore = k.pop;
    s.player.res.food = 400;
    for (let i = 0; i < 600; i++) s.tick(0.1); // 60 sn
    expect(k.pop).toBeGreaterThan(popBefore);
    expect(k.tiles.size).toBeGreaterThanOrEqual(tilesBefore);
    expect(k.power).toBeGreaterThan(10 - 1);
  });

  it('hediye ilişkiyi artırır ve altın harcar', () => {
    const { s } = withKingdoms();
    const k = s.kingdoms.kingdoms[0];
    s.player.res.gold = 100;
    const relBefore = k.relation;
    expect(s.applyCommand({ kind: 'diplo', kingdomId: k.id, action: 'gift' })).toBe(true);
    expect(k.relation).toBeGreaterThan(relBefore);
    expect(s.player.res.gold).toBe(50);
  });

  it('savaş ilanı durumu değiştirir ve itibar düşürür', () => {
    const { s } = withKingdoms();
    const k = s.kingdoms.kingdoms[0];
    const rep = s.player.reputation;
    s.applyCommand({ kind: 'diplo', kingdomId: k.id, action: 'war' });
    expect(k.status).toBe('war');
    expect(k.relation).toBe(-100);
    expect(s.player.reputation).toBeLessThan(rep);
  });

  it('ilişki 45 altındayken ittifak reddedilir', () => {
    const { s } = withKingdoms();
    const k = s.kingdoms.kingdoms[0];
    k.relation = 0;
    expect(s.applyCommand({ kind: 'diplo', kingdomId: k.id, action: 'ally' })).toBe(false);
    expect(k.status).toBe('neutral');
  });

  it('zayıfken haraç isteği reddedilir', () => {
    const { s } = withKingdoms();
    const k = s.kingdoms.kingdoms[0];
    k.power = 1000;
    expect(s.applyCommand({ kind: 'diplo', kingdomId: k.id, action: 'tribute' })).toBe(false);
  });

  it('ticaret anlaşması altın akışı sağlar', () => {
    const { s } = withKingdoms();
    const k = s.kingdoms.kingdoms[0];
    k.relation = 90; // kabul şansını garantiye yaklaştır
    s.player.res.gold = 100;
    // deterministik rng — kabul edilene dek dene (en fazla 10)
    let ok = false;
    for (let i = 0; i < 10 && !ok; i++) {
      ok = s.applyCommand({ kind: 'diplo', kingdomId: k.id, action: 'trade' });
    }
    expect(ok).toBe(true);
    const goldBefore = s.player.res.gold;
    s.player.res.food = 400;
    for (let i = 0; i < 300; i++) s.tick(0.1); // 30 sn
    expect(s.player.res.gold).toBeGreaterThan(goldBefore);
  });
});

describe('M3 — Sis (keşif)', () => {
  it('başlangıçta her yer karanlık; köy kurulunca çevre açılır', () => {
    const w = new World(64, 64, 42);
    const s = new Sim(w);
    expect(s.vis.every(v => v === 0)).toBe(true);
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    expect(s.vis[w.idx(p.x, p.y)]).toBe(2); // merkez görüşte
    let seen = 0;
    for (let i = 0; i < s.vis.length; i++) if (s.vis[i] > 0) seen++;
    expect(seen).toBeGreaterThan(50); // merkez çevresi açıldı
  });

  it('pickStartRegion kurulabilir bir kara karosu döndürür', () => {
    const w = new World(96, 96, 7);
    const s = new Sim(w);
    const spot = s.pickStartRegion();
    expect(w.inBounds(spot.x, spot.y)).toBe(true);
    expect(isWater(w.tiles[w.idx(spot.x, spot.y)])).toBe(false);
  });

  it('revealStartArea sisi açar', () => {
    const w = new World(64, 64, 42);
    const s = new Sim(w);
    s.revealStartArea(32, 32, 10);
    let seen = 0;
    for (let i = 0; i < s.vis.length; i++) if (s.vis[i] > 0) seen++;
    expect(seen).toBeGreaterThan(200);
  });
});

describe('M3 — Kayıt & determinizm (kritik)', () => {
  it('serialize → restore → devam == kesintisiz devam (birebir)', () => {
    // A: kesintisiz 400 tick
    const runA = (): unknown => {
      const w = new World(64, 64, 777);
      const s = new Sim(w);
      s.kingdoms.spawn(4);
      const p = findLand(w);
      s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
      s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
      completeAll(s);
      for (let i = 0; i < 400; i++) s.tick(0.1);
      s.drainEvents();
      return s.snapshot();
    };
    // B: 200 tick → kaydet → geri yükle → 200 tick daha
    const runB = (): unknown => {
      const w1 = new World(64, 64, 777);
      const s1 = new Sim(w1);
      s1.kingdoms.spawn(4);
      const p = findLand(w1);
      s1.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
      s1.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
      completeAll(s1);
      for (let i = 0; i < 200; i++) s1.tick(0.1);
      const saved = JSON.parse(JSON.stringify(s1.serialize()));
      // taze dünya + restore (gerçek yükleme akışı)
      const w2 = new World(saved.world.W, saved.world.H, saved.world.seed);
      const s2 = Sim.restore(w2, saved);
      for (let i = 0; i < 200; i++) s2.tick(0.1);
      s2.drainEvents();
      return s2.snapshot();
    };
    expect(JSON.stringify(runB())).toBe(JSON.stringify(runA()));
  });

  it('krallıklar + olaylar dahil uzun determinizm', () => {
    const run = (): unknown => {
      const w = new World(64, 64, 31337);
      const s = new Sim(w);
      s.kingdoms.spawn(5);
      const p = findLand(w);
      s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
      completeAll(s);
      s.player.res.food = 450;
      for (let i = 0; i < 1000; i++) s.tick(0.1); // 100 sn — olaylar tetiklenir
      s.drainEvents();
      return s.snapshot();
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
