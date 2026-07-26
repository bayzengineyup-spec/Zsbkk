import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { applyOfflineProgress, OFFLINE_CAP } from '../core/offline';
import { completeAll, findLand } from './helpers';

function village(seed = 42): { w: World; s: Sim; p: { x: number; y: number } } {
  const w = new World(64, 64, seed);
  const s = new Sim(w);
  const p = findLand(w);
  s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
  completeAll(s);
  s.events.eventAcc = -1e9;
  s.player.res.food = 400; s.player.res.wood = 400;
  s.player.res.stone = 400; s.player.res.gold = 400;
  return { w, s, p };
}

/** Tarlalı + işçili köy kur. */
function farmVillage(seed = 42): { s: Sim; fx: number; fy: number } {
  const { s, p } = village(seed);
  let fx = -1, fy = -1;
  outer:
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      if (!dx && !dy) continue;
      if (s.canPlaceOn('farm', p.x + dx, p.y + dy)) { fx = p.x + dx; fy = p.y + dy; break outer; }
    }
  }
  expect(fx).toBeGreaterThanOrEqual(0);
  s.applyCommand({ kind: 'place', building: 'farm', x: fx, y: fy });
  completeAll(s);
  s.applyCommand({ kind: 'assign', x: fx, y: fy, delta: 1 });
  s.applyCommand({ kind: 'assign', x: fx, y: fy, delta: 1 });
  return { s, fx, fy };
}

describe('Faz 3 — çevrimdışı ilerleme', () => {
  it('2 dakikadan kısa süre yok sayılır', () => {
    const { s } = farmVillage();
    expect(applyOfflineProgress(s, 60)).toBeNull();
  });

  it('işçili tarla çevrimdışı yiyecek üretir, rapor kazancı bildirir', () => {
    const { s } = farmVillage();
    const before = s.player.res.food;
    const rep = applyOfflineProgress(s, 3600);
    expect(rep).not.toBeNull();
    expect(rep!.seconds).toBe(3600);
    // üretim eksi yeme → net değişim rapor tutarlı olmalı
    const foodGain = rep!.gains.find(([k]) => k === 'food')?.[1] ?? 0;
    expect(foodGain).toBeGreaterThan(0);
    expect(s.player.res.food).toBeCloseTo(before + foodGain + (rep!.gains.length ? 0 : 0) - rep!.eaten, -1);
  });

  it('süre 8 saat tavanına kırpılır ve depo tavanı aşılmaz', () => {
    const { s } = farmVillage();
    const rep = applyOfflineProgress(s, 48 * 3600);
    expect(rep!.seconds).toBe(OFFLINE_CAP);
    expect(s.player.res.food).toBeLessThanOrEqual(s.player.storageCap);
  });

  it('çevrimdışında kimse ölmez, nüfus değişmez (yiyecek bitse bile)', () => {
    const { s } = farmVillage();
    s.player.res.food = 1; // neredeyse aç
    const pop = s.player.pop;
    const rep = applyOfflineProgress(s, OFFLINE_CAP);
    expect(rep).not.toBeNull();
    expect(s.player.pop).toBe(pop);
    expect(s.player.res.food).toBeGreaterThanOrEqual(0);
  });

  it('aynı girdiyle deterministik: iki eş köyde aynı sonuç', () => {
    const a = farmVillage(77).s;
    const b = farmVillage(77).s;
    applyOfflineProgress(a, 5000);
    applyOfflineProgress(b, 5000);
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  it('zincir binaları (girdi tüketen) çevrimdışı üretmez', () => {
    const { s } = farmVillage();
    // bıçkıhane kur + işçi ata (girdili bina)
    let lx = -1, ly = -1;
    const c = s.villageCenter();
    outer:
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (s.canPlaceOn('lumbermill', c.x + dx, c.y + dy)) { lx = c.x + dx; ly = c.y + dy; break outer; }
      }
    }
    if (lx >= 0) {
      s.player.res.wood = 500; s.player.res.stone = 500;
      s.applyCommand({ kind: 'place', building: 'lumbermill', x: lx, y: ly });
      completeAll(s);
      s.applyCommand({ kind: 'assign', x: lx, y: ly, delta: 1 });
      const rep = applyOfflineProgress(s, 3600);
      const plankGain = rep?.gains.find(([k]) => k === 'plank')?.[1] ?? 0;
      expect(plankGain).toBe(0); // zincir çevrimdışı çalışmaz (bilinçli)
    }
  });
});
