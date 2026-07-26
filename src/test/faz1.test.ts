import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { BUILDINGS } from '../data/buildings';
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

describe('Faz 1 — İnşa süreleri', () => {
  it('bina kurulunca İNŞA HALİNDE başlar: kapasite/üretim yok, süre bitince aktif', () => {
    const { s, p } = village();
    const popCapBefore = s.player.popCap;
    s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
    const b = s.buildingAt(p.x + 1, p.y)!;
    expect(b.buildLeft).toBeGreaterThan(0);
    expect(s.player.popCap).toBe(popCapBefore); // henüz katkı yok
    // ev 16 sn (Aşama 3: süreler ×1.6); 3 şantiye işçisi → 2.5x → ~6.4 sn
    for (let i = 0; i < 90; i++) s.tick(0.1);
    expect(b.buildLeft).toBeUndefined();
    expect(s.player.popCap).toBe(popCapBefore + 6); // şimdi katkı var
  });

  it('boşta işçiler inşaatı hızlandırır', () => {
    // işçisiz köy vs işçili köy karşılaştırması
    const t1 = (() => {
      const { s, p } = village(9);
      s.player.idle = 0; // herkes meşgul — şantiyeye yardım eden yok
      s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
      let ticks = 0;
      while (s.buildingAt(p.x + 1, p.y)!.buildLeft !== undefined && ticks < 2000) {
        s.tick(0.1); ticks++;
      }
      return ticks;
    })();
    const t2 = (() => {
      const { s, p } = village(9); // 5 boşta işçi
      s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
      let ticks = 0;
      while (s.buildingAt(p.x + 1, p.y)!.buildLeft !== undefined && ticks < 2000) {
        s.tick(0.1); ticks++;
      }
      return ticks;
    })();
    expect(t2).toBeLessThan(t1); // işçili köy belirgin hızlı
    expect(t1).toBeLessThanOrEqual(165); // temel hız 1x → ~16 sn (Aşama 3 süreleri)
    expect(t2).toBeLessThanOrEqual(70);  // 2.5x → ~6.4 sn (Aşama 3 süreleri)
  });

  it('inşaat kuyruğu sınırı: merkez sv1 → 2 eşzamanlı inşaat', () => {
    const { s, p } = village();
    expect(s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y })).toBe(true);
    expect(s.applyCommand({ kind: 'place', building: 'house', x: p.x + 2, y: p.y })).toBe(true);
    // 3.sü reddedilir (limit = merkez sv 1 + 1 = 2)
    expect(s.applyCommand({ kind: 'place', building: 'house', x: p.x + 3, y: p.y })).toBe(false);
    completeAll(s);
    // kuyruk boşaldı — yeniden kurulabilir
    expect(s.applyCommand({ kind: 'place', building: 'house', x: p.x + 3, y: p.y })).toBe(true);
  });

  it('inşaat iptali maliyetin %70 ini iade eder', () => {
    const { s, p } = village();
    const woodBefore = s.player.res.wood;
    s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y }); // -30
    expect(s.player.res.wood).toBe(woodBefore - 30);
    s.applyCommand({ kind: 'demolish', x: p.x + 1, y: p.y }); // +21 iade
    expect(s.player.res.wood).toBe(woodBefore - 30 + 21);
    expect(s.buildingAt(p.x + 1, p.y)).toBeNull();
  });

  it('inşa halindeki binaya işçi atanamaz', () => {
    const { w, s } = village(7);
    const fertile = new Set(['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore']);
    let fp: { x: number; y: number } | null = null;
    for (let y = 12; y < w.H - 12 && !fp; y++) {
      for (let x = 12; x < w.W - 12 && !fp; x++) {
        if (fertile.has(w.tiles[w.idx(x, y)]) && !s.buildingAt(x, y)) fp = { x, y };
      }
    }
    s.applyCommand({ kind: 'place', building: 'farm', x: fp!.x, y: fp!.y });
    expect(s.applyCommand({ kind: 'assign', x: fp!.x, y: fp!.y, delta: 1 })).toBe(false);
    completeAll(s);
    expect(s.applyCommand({ kind: 'assign', x: fp!.x, y: fp!.y, delta: 1 })).toBe(true);
  });
});

describe('Faz 1 — Genel yükseltme', () => {
  it('ev yükseltilir: süre işler, bitince +3 kapasite', () => {
    const { s, p } = village();
    s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
    completeAll(s);
    const capBefore = s.player.popCap;
    expect(s.applyCommand({ kind: 'upgrade', x: p.x + 1, y: p.y })).toBe(true);
    const b = s.buildingAt(p.x + 1, p.y)!;
    expect(b.upgrading).toBe(true);
    expect(s.player.popCap).toBe(capBefore); // yükseltme sürerken eski değer
    completeAll(s);
    expect(b.level).toBe(2);
    expect(s.player.popCap).toBe(capBefore + 3);
  });

  it('azami seviyede yükseltme reddedilir', () => {
    const { s, p } = village();
    s.applyCommand({ kind: 'place', building: 'house', x: p.x + 1, y: p.y });
    completeAll(s);
    const max = BUILDINGS.house.maxLevel;
    for (let lv = 1; lv < max; lv++) {
      expect(s.applyCommand({ kind: 'upgrade', x: p.x + 1, y: p.y })).toBe(true);
      completeAll(s);
    }
    expect(s.buildingAt(p.x + 1, p.y)!.level).toBe(max);
    expect(s.applyCommand({ kind: 'upgrade', x: p.x + 1, y: p.y })).toBe(false);
  });

  it('üretim binası yükseltilince üretimi artar (seviye çarpanı)', () => {
    const { w, s } = village(7);
    const fertile = new Set(['grass', 'savanna', 'forest', 'swamp', 'beach', 'shore']);
    let fp: { x: number; y: number } | null = null;
    for (let y = 12; y < w.H - 12 && !fp; y++) {
      for (let x = 12; x < w.W - 12 && !fp; x++) {
        if (fertile.has(w.tiles[w.idx(x, y)]) && !s.buildingAt(x, y)) fp = { x, y };
      }
    }
    s.applyCommand({ kind: 'place', building: 'farm', x: fp!.x, y: fp!.y });
    completeAll(s);
    s.applyCommand({ kind: 'assign', x: fp!.x, y: fp!.y, delta: 1 });
    s.applyCommand({ kind: 'upgrade', x: fp!.x, y: fp!.y });
    completeAll(s);
    expect(s.buildingAt(fp!.x, fp!.y)!.level).toBe(2);
    // sv2 tarla: üretim ~2x (economyTick b.level çarpanı) — 10 sn'de fark görünür
    const before = s.player.res.food;
    for (let i = 0; i < 100; i++) s.tick(0.1);
    expect(s.player.res.food).toBeGreaterThan(before);
  });

  it('ambar yükseltilince depo kapasitesi katlanır', () => {
    const { s, p } = village();
    s.applyCommand({ kind: 'place', building: 'storehouse', x: p.x + 1, y: p.y });
    completeAll(s);
    const cap1 = s.player.storageCap;
    s.applyCommand({ kind: 'upgrade', x: p.x + 1, y: p.y });
    completeAll(s);
    expect(s.player.storageCap).toBeGreaterThan(cap1);
  });
});

describe('Faz 1 — Kayıt determinizmi (inşaat ortasında)', () => {
  it('şantiye + eğitim kuyruğu ortasında kaydet→yükle→devam birebir', () => {
    const build = (): Sim => {
      const w = new World(64, 64, 555);
      const s = new Sim(w);
      s.kingdoms.spawn(3);
      const p = findLand(w);
      s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
      completeAll(s);
      s.player.res.food = 450; s.player.res.wood = 450;
      s.player.res.stone = 450; s.player.res.gold = 450;
      s.applyCommand({ kind: 'place', building: 'barracks', x: p.x + 1, y: p.y });
      completeAll(s);
      s.applyCommand({ kind: 'train', unit: 'spear' });
      s.applyCommand({ kind: 'train', unit: 'archer' });
      // şantiye SÜRERKEN kaydedeceğiz
      s.applyCommand({ kind: 'place', building: 'house', x: p.x + 2, y: p.y });
      s.applyCommand({ kind: 'upgrade', x: p.x + 1, y: p.y });
      return s;
    };
    const runA = (): unknown => {
      const s = build();
      for (let i = 0; i < 300; i++) s.tick(0.1);
      s.drainEvents();
      return s.snapshot();
    };
    const runB = (): unknown => {
      const s1 = build();
      for (let i = 0; i < 40; i++) s1.tick(0.1); // inşaat + kuyruk ortası
      const saved = JSON.parse(JSON.stringify(s1.serialize()));
      const w2 = new World(saved.world.W, saved.world.H, saved.world.seed);
      const s2 = Sim.restore(w2, saved);
      for (let i = 0; i < 260; i++) s2.tick(0.1);
      s2.drainEvents();
      return s2.snapshot();
    };
    expect(JSON.stringify(runB())).toBe(JSON.stringify(runA()));
  });
});
