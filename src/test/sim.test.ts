import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import type { Command } from '../core/commands';
import { BUILDINGS } from '../data/buildings';
import { isWater } from '../data/biomes';
import { completeAll } from './helpers';

/** Testler için: haritada kurulabilir bir kara karosu bul. */
function findLand(w: World, rule?: (x: number, y: number) => boolean): { x: number; y: number } {
  for (let y = 2; y < w.H - 2; y++) {
    for (let x = 2; x < w.W - 2; x++) {
      if (!isWater(w.tiles[w.idx(x, y)]) && (!rule || rule(x, y))) return { x, y };
    }
  }
  throw new Error('kara bulunamadı');
}

function newSim(seed = 42): { w: World; s: Sim } {
  const w = new World(64, 64, seed);
  return { w, s: new Sim(w) };
}

describe('Sim — bina yerleştirme', () => {
  it('köy meydanı kurulunca merkez + nüfus kapasitesi + köylüler gelir', () => {
    const { w, s } = newSim();
    const p = findLand(w);
    expect(s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y })).toBe(true);
    expect(s.player.hasCenter).toBe(false); // inşaat sürüyor (Faz 1)
    completeAll(s);
    expect(s.player.hasCenter).toBe(true);
    expect(s.player.popCap).toBe(5);
    expect(s.villagers.length).toBe(5);
  });

  it('ikinci köy meydanı reddedilir (unique)', () => {
    const { w, s } = newSim();
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    expect(s.applyCommand({ kind: 'place', building: 'center', x: p.x + 2, y: p.y })).toBe(false);
  });

  it('suya kurulamaz', () => {
    const { w, s } = newSim();
    let wx = -1, wy = -1;
    outer: for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      if (isWater(w.tiles[w.idx(x, y)])) { wx = x; wy = y; break outer; }
    }
    expect(wx).toBeGreaterThanOrEqual(0);
    expect(s.applyCommand({ kind: 'place', building: 'house', x: wx, y: wy })).toBe(false);
  });

  it('dolu karoya kurulamaz', () => {
    const { w, s } = newSim();
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    expect(s.applyCommand({ kind: 'place', building: 'house', x: p.x, y: p.y })).toBe(false);
  });

  it('maliyet düşülür, kaynak yetmezse reddedilir', () => {
    const { w, s } = newSim();
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    const woodBefore = s.player.res.wood;
    expect(s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y })).toBe(true);
    expect(s.player.res.wood).toBe(woodBefore - (BUILDINGS.house.cost.wood ?? 0));
    s.player.res.wood = 0;
    expect(s.applyCommand({ kind: 'place', building: 'house', x: p.x + 2, y: p.y })).toBe(false);
  });
});

describe('Sim — işçi ve üretim', () => {
  function withFarm(): { s: Sim; fx: number; fy: number } {
    const { w, s } = newSim(7);
    const fertile = new Set(['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore']);
    const p = findLand(w, (x, y) => fertile.has(w.tiles[w.idx(x, y)])
      && fertile.has(w.tiles[w.idx(x + 1, y)]));
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    expect(s.applyCommand({ kind: 'place', building: 'farm', x: p.x + 1, y: p.y })).toBe(true);
    completeAll(s);
    return { s, fx: p.x + 1, fy: p.y };
  }

  it('işçi atanır, boşta sayısı düşer; işçili tarla yiyecek üretir', () => {
    const { s, fx, fy } = withFarm();
    expect(s.applyCommand({ kind: 'assign', x: fx, y: fy, delta: 1 })).toBe(true);
    expect(s.player.idle).toBe(4);
    const before = s.player.res.food;
    for (let i = 0; i < 100; i++) s.tick(0.1); // 10 sn
    expect(s.player.res.food).toBeGreaterThan(before - 1); // üretim tüketimi karşılıyor
  });

  it('işçisiz bina üretmez, nüfus yiyecek tüketir', () => {
    const { s } = withFarm();
    const before = s.player.res.food;
    for (let i = 0; i < 100; i++) s.tick(0.1);
    expect(s.player.res.food).toBeLessThan(before);
  });

  it('bina kapasitesinden fazla işçi atanamaz', () => {
    const { s, fx, fy } = withFarm();
    const max = BUILDINGS.farm.maxWorkers;
    for (let i = 0; i < max; i++) {
      expect(s.applyCommand({ kind: 'assign', x: fx, y: fy, delta: 1 })).toBe(true);
    }
    expect(s.applyCommand({ kind: 'assign', x: fx, y: fy, delta: 1 })).toBe(false);
  });

  it('yiyecek biterse açlıktan ölüm başlar', () => {
    const { w, s } = newSim(3);
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    completeAll(s);
    s.player.res.food = 0;
    const popBefore = s.player.pop;
    for (let i = 0; i < 200; i++) s.tick(0.1); // 20 sn — birkaç ölüm döngüsü
    expect(s.player.pop).toBeLessThan(popBefore);
    expect(s.villagers.length).toBe(s.player.pop);
  });
});

describe('Sim — yükseltme ve yıkım', () => {
  it('köy meydanı yükseltilir, kapasite artar', () => {
    const { w, s } = newSim();
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    completeAll(s);
    s.player.res.wood = 500; s.player.res.stone = 500;
    expect(s.applyCommand({ kind: 'upgrade', x: p.x, y: p.y })).toBe(true);
    expect(s.player.popCap).toBe(5); // yükseltme sürerken eski kapasite
    completeAll(s);
    expect(s.player.popCap).toBe(12);
  });

  it('yıkımda işçiler serbest kalır; merkez yıkılamaz', () => {
    const { w, s } = newSim(7);
    const fertile = new Set(['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore']);
    const p = findLand(w, (x, y) => fertile.has(w.tiles[w.idx(x, y)])
      && fertile.has(w.tiles[w.idx(x + 1, y)]));
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    s.applyCommand({ kind: 'place', building: 'farm', x: p.x + 1, y: p.y });
    completeAll(s);
    s.applyCommand({ kind: 'assign', x: p.x + 1, y: p.y, delta: 1 });
    expect(s.player.idle).toBe(4);
    expect(s.applyCommand({ kind: 'demolish', x: p.x + 1, y: p.y })).toBe(true);
    expect(s.player.idle).toBe(5);
    expect(s.applyCommand({ kind: 'demolish', x: p.x, y: p.y })).toBe(false);
  });
});

describe('Sim — determinizm (çok oyunculu temeli)', () => {
  it('aynı tohum + aynı komutlar + aynı tick → birebir aynı durum', () => {
    const run = (): unknown => {
      const w = new World(64, 64, 12345);
      const s = new Sim(w);
      const p = findLand(w);
      const cmds: Command[] = [
        { kind: 'place', building: 'center', x: p.x, y: p.y },
        { kind: 'place', building: 'house', x: p.x + 1, y: p.y },
      ];
      for (const c of cmds) s.applyCommand(c);
      for (let i = 0; i < 300; i++) s.tick(0.1); // 30 sn simülasyon
      s.drainEvents();
      return s.snapshot();
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('mevsim döngüsü ilerler ve yıl artar', () => {
    const { w, s } = newSim();
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    s.player.res.food = 400; // kıştan sağ çıksın
    for (let i = 0; i < 3700; i++) s.tick(0.1); // 370 sn > 4 mevsim
    expect(s.time.year).toBe(2);
  });
});
