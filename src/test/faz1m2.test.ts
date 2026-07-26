import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { completeAll, findLand } from './helpers';

/** Zengin, olaysız köy. */
function village(seed = 42): { w: World; s: Sim; p: { x: number; y: number } } {
  const w = new World(64, 64, seed);
  const s = new Sim(w);
  const p = findLand(w);
  s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
  completeAll(s);
  s.events.eventAcc = -1e9;
  s.player.storageCap = 5000;
  s.player.res.food = 1000; s.player.res.wood = 1000;
  s.player.res.stone = 1000; s.player.res.gold = 1000;
  return { w, s, p };
}

describe('Faz 1 M2 — Üretim zincirleri', () => {
  it('bıçkıhane odunu keresteye çevirir (girdi tüketir)', () => {
    const { s, p } = village();
    s.applyCommand({ kind: 'place', building: 'lumbermill', x: p.x + 1, y: p.y });
    completeAll(s);
    s.applyCommand({ kind: 'assign', x: p.x + 1, y: p.y, delta: 1 });
    const woodBefore = s.player.res.wood;
    for (let i = 0; i < 100; i++) s.tick(0.1); // 10 sn
    expect(s.player.res.plank).toBeGreaterThan(1);   // kereste üretildi
    expect(s.player.res.wood).toBeLessThan(woodBefore); // odun tüketildi
  });

  it('girdi biterse üretim durur; girdi gelince devam eder', () => {
    const { s, p } = village();
    s.applyCommand({ kind: 'place', building: 'lumbermill', x: p.x + 1, y: p.y });
    completeAll(s);
    s.applyCommand({ kind: 'assign', x: p.x + 1, y: p.y, delta: 1 });
    s.player.res.wood = 0; // girdi yok
    for (let i = 0; i < 50; i++) s.tick(0.1);
    expect(s.player.res.plank).toBeLessThan(0.05); // üretim yok denecek kadar az
    s.player.res.wood = 100; // girdi geldi
    for (let i = 0; i < 50; i++) s.tick(0.1);
    expect(s.player.res.plank).toBeGreaterThan(0.5); // üretim başladı
  });

  it('değirmen kereste ister (zincir sırası zorunlu)', () => {
    const { s, p } = village();
    expect(s.player.res.plank).toBe(0);
    // kereste yokken değirmen kurulamaz
    expect(s.applyCommand({ kind: 'place', building: 'mill', x: p.x + 1, y: p.y })).toBe(false);
    s.player.res.plank = 20;
    expect(s.applyCommand({ kind: 'place', building: 'mill', x: p.x + 1, y: p.y })).toBe(true);
  });

  it('tam zincir: tarla → değirmen → fırın ekmek üretir', () => {
    const { w, s } = village(7);
    const fertile = new Set(['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore']);
    let fp: { x: number; y: number } | null = null;
    for (let y = 12; y < w.H - 12 && !fp; y++) {
      for (let x = 12; x < w.W - 12 && !fp; x++) {
        if (fertile.has(w.tiles[w.idx(x, y)]) && !s.buildingAt(x, y)
          && !s.buildingAt(x + 1, y) && !s.buildingAt(x + 2, y)) fp = { x, y };
      }
    }
    s.player.res.plank = 40;
    s.applyCommand({ kind: 'place', building: 'farm', x: fp!.x, y: fp!.y });
    s.applyCommand({ kind: 'place', building: 'mill', x: fp!.x + 1, y: fp!.y });
    completeAll(s);
    s.applyCommand({ kind: 'place', building: 'bakery', x: fp!.x + 2, y: fp!.y });
    completeAll(s);
    s.applyCommand({ kind: 'assign', x: fp!.x, y: fp!.y, delta: 1 });
    s.applyCommand({ kind: 'assign', x: fp!.x + 1, y: fp!.y, delta: 1 });
    s.applyCommand({ kind: 'assign', x: fp!.x + 2, y: fp!.y, delta: 1 });
    for (let i = 0; i < 400; i++) s.tick(0.1); // 40 sn
    // not: fırın, değirmenin ürettiği unu anında tüketir → un ~0'da dengelenir;
    // zincirin kanıtı ekmek birikimidir
    expect(s.player.res.bread).toBeGreaterThan(0.5);
  });

  it('ekmek önce tüketilir (1 ekmek = 2 yiyecek) ve mutluluk verir', () => {
    const { s } = village();
    // yalnız tüketim: üretim yok
    s.player.res.bread = 50;
    const foodBefore = s.player.res.food;
    const breadBefore = s.player.res.bread;
    for (let i = 0; i < 100; i++) s.tick(0.1); // 10 sn
    expect(s.player.res.bread).toBeLessThan(breadBefore); // ekmek yendi
    expect(s.player.res.food).toBe(foodBefore);           // yiyecek dokunulmadı
    // mutluluk hedefi ekmek bonusuyla daha yüksek olmalı
    const happyWithBread = s.player.happy;
    const { s: s2 } = village();
    for (let i = 0; i < 100; i++) s2.tick(0.1);
    expect(happyWithBread).toBeGreaterThan(s2.player.happy);
  });

  it('depo dolunca uyarı bildirimi gelir', () => {
    const { s, p } = village();
    s.applyCommand({ kind: 'place', building: 'lumbermill', x: p.x + 1, y: p.y });
    completeAll(s);
    s.applyCommand({ kind: 'assign', x: p.x + 1, y: p.y, delta: 1 });
    s.player.storageCap = 100;
    s.player.res.plank = 100; // kereste deposu dolu
    s.drainEvents();
    for (let i = 0; i < 50; i++) s.tick(0.1);
    const msgs = s.drainEvents().map(e => e.msg);
    expect(msgs.some(m => m.includes('Depo dolu'))).toBe(true);
  });
});

describe('Faz 1 M2 — Zincir dahil kayıt determinizmi', () => {
  it('zincir üretimi ortasında kaydet→yükle→devam birebir', () => {
    const build = (): Sim => {
      const w = new World(64, 64, 888);
      const s = new Sim(w);
      s.kingdoms.spawn(3);
      const p = findLand(w);
      s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
      completeAll(s);
      s.player.storageCap = 5000;
      s.player.res.food = 1000; s.player.res.wood = 1000;
      s.player.res.stone = 1000; s.player.res.plank = 40;
      s.applyCommand({ kind: 'place', building: 'lumbermill', x: p.x + 1, y: p.y });
      s.applyCommand({ kind: 'place', building: 'bakery', x: p.x + 2, y: p.y });
      completeAll(s);
      s.applyCommand({ kind: 'assign', x: p.x + 1, y: p.y, delta: 1 });
      s.applyCommand({ kind: 'assign', x: p.x + 2, y: p.y, delta: 1 });
      s.player.res.flour = 30;
      return s;
    };
    const runA = (): unknown => {
      const s = build();
      for (let i = 0; i < 400; i++) s.tick(0.1);
      s.drainEvents();
      return s.snapshot();
    };
    const runB = (): unknown => {
      const s1 = build();
      for (let i = 0; i < 200; i++) s1.tick(0.1);
      const saved = JSON.parse(JSON.stringify(s1.serialize()));
      const w2 = new World(saved.world.W, saved.world.H, saved.world.seed);
      const s2 = Sim.restore(w2, saved);
      for (let i = 0; i < 200; i++) s2.tick(0.1);
      s2.drainEvents();
      return s2.snapshot();
    };
    expect(JSON.stringify(runB())).toBe(JSON.stringify(runA()));
  });
});
