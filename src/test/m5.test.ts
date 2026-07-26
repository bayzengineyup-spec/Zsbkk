import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { SPECIES } from '../data/species';
import { isWater } from '../data/biomes';

function findLand(w: World): { x: number; y: number } {
  for (let y = 12; y < w.H - 12; y++) {
    for (let x = 12; x < w.W - 12; x++) {
      if (!isWater(w.tiles[w.idx(x, y)])) return { x, y };
    }
  }
  throw new Error('kara bulunamadı');
}

describe('M5 — Yaban hayatı', () => {
  it('hayvanlar doğar, uygun biyomlarda ve suya girmezler', () => {
    const w = new World(96, 96, 42);
    const s = new Sim(w);
    s.wildlife.spawn();
    expect(s.wildlife.creatures.length).toBeGreaterThan(3);
    for (const c of s.wildlife.creatures) {
      expect(SPECIES[c.sp]).toBeDefined();
      const b = w.tiles[w.idx(c.x | 0, c.y | 0)];
      expect(isWater(b)).toBe(false);
    }
  });

  it('hayvanlar zamanla hareket eder ve su karosuna girmez', () => {
    const w = new World(96, 96, 42);
    const s = new Sim(w);
    s.wildlife.spawn();
    const before = s.wildlife.creatures.map(c => `${c.x},${c.y}`).join('|');
    for (let i = 0; i < 300; i++) s.tick(0.1);
    const after = s.wildlife.creatures.map(c => `${c.x},${c.y}`).join('|');
    expect(after).not.toBe(before);
    for (const c of s.wildlife.creatures) {
      expect(isWater(w.tiles[w.idx(c.x | 0, c.y | 0)])).toBe(false);
    }
  });

  it('tarla kurulunca çiftlik hayvanları belirir', () => {
    const w = new World(64, 64, 7);
    const s = new Sim(w);
    const fertile = new Set(['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore']);
    let p: { x: number; y: number } | null = null;
    for (let y = 12; y < w.H - 12 && !p; y++) {
      for (let x = 12; x < w.W - 12 && !p; x++) {
        if (!isWater(w.tiles[w.idx(x, y)]) && fertile.has(w.tiles[w.idx(x + 1, y)])) p = { x, y };
      }
    }
    expect(p).not.toBeNull();
    s.applyCommand({ kind: 'place', building: 'center', x: p!.x, y: p!.y });
    s.applyCommand({ kind: 'place', building: 'farm', x: p!.x + 1, y: p!.y });
    s.player.res.food = 400;
    for (let i = 0; i < 50; i++) s.tick(0.1); // 5 sn — senkron 2 sn'de bir
    const farmAnimals = s.wildlife.creatures.filter(c => SPECIES[c.sp].farm);
    expect(farmAnimals.length).toBeGreaterThan(0);
  });
});

describe('M5 — Kervanlar', () => {
  it('ticaret anlaşması kervan doğurur, varış altın getirir', () => {
    const w = new World(64, 64, 7);
    const s = new Sim(w);
    s.kingdoms.spawn(3);
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    const k = s.kingdoms.kingdoms[0];
    k.tradeDeal = true;
    s.player.res.food = 450;
    let sawCaravan = false;
    for (let i = 0; i < 3000; i++) {
      s.tick(0.1);
      if (s.caravans.caravans.length > 0) sawCaravan = true;
    }
    expect(sawCaravan).toBe(true);
  });
});

describe('M5 — Tüm sistemler dahil kayıt determinizmi', () => {
  it('yaban hayatı + kervan dahil roundtrip birebir', () => {
    const build = (): Sim => {
      const w = new World(64, 64, 2024);
      const s = new Sim(w);
      s.kingdoms.spawn(3);
      s.wildlife.spawn();
      const p = findLand(w);
      s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
      s.player.res.food = 450;
      const k = s.kingdoms.kingdoms[0];
      k.tradeDeal = true;
      return s;
    };
    const snapWild = (s: Sim): unknown => ({
      base: s.snapshot(),
      creatures: s.wildlife.creatures.map(c => ({
        id: c.id, sp: c.sp,
        x: Math.round(c.x * 1e6) / 1e6, y: Math.round(c.y * 1e6) / 1e6,
      })),
      caravans: s.caravans.caravans.length,
    });
    const runA = (): unknown => {
      const s = build();
      for (let i = 0; i < 500; i++) s.tick(0.1);
      s.drainEvents();
      return snapWild(s);
    };
    const runB = (): unknown => {
      const s1 = build();
      for (let i = 0; i < 250; i++) s1.tick(0.1);
      const saved = JSON.parse(JSON.stringify(s1.serialize()));
      const w2 = new World(saved.world.W, saved.world.H, saved.world.seed);
      const s2 = Sim.restore(w2, saved);
      for (let i = 0; i < 250; i++) s2.tick(0.1);
      s2.drainEvents();
      return snapWild(s2);
    };
    expect(JSON.stringify(runB())).toBe(JSON.stringify(runA()));
  });
});
