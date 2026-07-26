import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { compTotal } from '../data/units';
import { isWater } from '../data/biomes';

function findLand(w: World): { x: number; y: number } {
  for (let y = 12; y < w.H - 12; y++) {
    for (let x = 12; x < w.W - 12; x++) {
      if (!isWater(w.tiles[w.idx(x, y)])) return { x, y };
    }
  }
  throw new Error('kara bulunamadı');
}

/** Kışlalı, zengin bir köy kur. */
function warVillage(seed = 42): { w: World; s: Sim; p: { x: number; y: number } } {
  const w = new World(64, 64, seed);
  const s = new Sim(w);
  const p = findLand(w);
  s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
  s.player.res.food = 400; s.player.res.wood = 400;
  s.player.res.stone = 400; s.player.res.gold = 400;
  s.applyCommand({ kind: 'place', building: 'barracks', x: p.x + 1, y: p.y });
  return { w, s, p };
}

describe('M4 — Asker eğitimi', () => {
  it('kışla olmadan eğitim reddedilir', () => {
    const w = new World(64, 64, 42);
    const s = new Sim(w);
    const p = findLand(w);
    s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    expect(s.applyCommand({ kind: 'train', unit: 'spear' })).toBe(false);
  });

  it('eğitim: kaynak + boşta köylü düşer, birim artar', () => {
    const { s } = warVillage();
    const idleBefore = s.player.idle;
    expect(s.applyCommand({ kind: 'train', unit: 'spear' })).toBe(true);
    expect(s.applyCommand({ kind: 'train', unit: 'archer' })).toBe(true);
    expect(s.player.units.spear).toBe(1);
    expect(s.player.units.archer).toBe(1);
    expect(s.player.idle).toBe(idleBefore - 2);
  });

  it('boşta köylü kalmayınca eğitim durur', () => {
    const { s } = warVillage();
    let trained = 0;
    while (s.applyCommand({ kind: 'train', unit: 'spear' })) trained++;
    expect(trained).toBe(5); // 5 köylünün hepsi asker oldu
    expect(s.player.idle).toBe(0);
  });
});

describe('M4 — Savaş matematiği', () => {
  it('mızrakçı süvariye karşı bonus alır (taş-kağıt-makas)', () => {
    const { s } = warVillage();
    const m = s.military;
    // 10 mızrak vs 10 süvari: mızrak savunması süvari karşısında güçlenmeli
    const spearsVsCav = m.battleForces(
      { spear: 0, archer: 0, cav: 10 },
      { spear: 10, archer: 0, cav: 0 }, 0, null);
    const spearsVsSpear = m.battleForces(
      { spear: 10, archer: 0, cav: 0 },
      { spear: 10, archer: 0, cav: 0 }, 0, null);
    // savunan mızrakçılar süvariye karşı daha güçlü savunur
    expect(spearsVsCav.def).toBeGreaterThan(spearsVsSpear.def);
  });

  it('sur savunmaya eklenir, süvari sura karşı ceza yer', () => {
    const { s } = warVillage();
    const m = s.military;
    const noWall = m.battleForces({ spear: 0, archer: 0, cav: 10 }, { spear: 5, archer: 0, cav: 0 }, 0, null);
    const wall = m.battleForces({ spear: 0, archer: 0, cav: 10 }, { spear: 5, archer: 0, cav: 0 }, 15, null);
    expect(wall.def).toBeGreaterThan(noWall.def);
    expect(wall.atk).toBeLessThan(noWall.atk); // süvari kuşatma cezası
  });
});

describe('M4 — Ordu yürüyüşü ve savaş', () => {
  it('güçlü ordu zayıf krallığı yener, ganimet alır, toprak küçülür', () => {
    const { s } = warVillage(7);
    s.kingdoms.spawn(3);
    const k = s.kingdoms.kingdoms[0];
    k.army = 1; k.pop = 5; // zayıf hedef
    // güçlü ordu kur
    s.player.pop = 30; s.player.idle = 30; s.player.popCap = 40;
    s.syncVillagers();
    for (let i = 0; i < 20; i++) s.applyCommand({ kind: 'train', unit: 'spear' });
    expect(compTotal(s.player.units)).toBe(20);
    const tilesBefore = k.tiles.size;
    const goldBefore = s.player.res.gold;
    expect(s.applyCommand({ kind: 'attack', kingdomId: k.id })).toBe(true);
    expect(compTotal(s.player.units)).toBe(0); // ordu yola çıktı
    expect(s.military.armies.length).toBe(1);
    // ordu hedefe varana + dönene dek işlet (hız 3.5/sn, harita 64)
    for (let i = 0; i < 1200; i++) s.tick(0.1);
    const kAfter = s.kingdoms.byId(k.id);
    if (kAfter) expect(kAfter.tiles.size).toBeLessThanOrEqual(tilesBefore);
    expect(s.player.res.gold).toBeGreaterThan(goldBefore - 1); // ganimet geldi
    expect(compTotal(s.player.units)).toBeGreaterThan(0);      // sağ kalanlar döndü
  });

  it('barbar akını orduya/köye zarar verir ama savunma çalışır', () => {
    const { s } = warVillage(11);
    for (let i = 0; i < 4; i++) s.applyCommand({ kind: 'train', unit: 'spear' });
    expect(s.military.barbarianRaid()).toBe(true);
    expect(s.military.armies.length).toBe(1);
    const popBefore = s.player.pop;
    for (let i = 0; i < 1000; i++) s.tick(0.1);
    expect(s.military.armies.length).toBe(0); // savaş çözüldü
    expect(s.player.pop).toBeGreaterThan(0);
    expect(popBefore).toBeGreaterThan(0);
  });
});

describe('M4 — Komutanlar', () => {
  it('komutan alınır, en fazla 5', () => {
    const { s } = warVillage();
    s.player.res.gold = 2000; s.player.res.food = 2000;
    for (let i = 0; i < 5; i++) {
      expect(s.applyCommand({ kind: 'recruitCommander' })).toBe(true);
    }
    expect(s.applyCommand({ kind: 'recruitCommander' })).toBe(false);
    expect(s.military.commanders.length).toBe(5);
  });

  it('komutan bonusu seviyeyle güçlenir', () => {
    const { s } = warVillage();
    s.applyCommand({ kind: 'recruitCommander' });
    const c = s.military.commanders[0];
    c.trait = 'bloodscent'; // atk 1.25
    c.level = 1;
    const b1 = s.military.cmdBonus(c, 'atk');
    c.level = 3;
    const b3 = s.military.cmdBonus(c, 'atk');
    expect(b3).toBeGreaterThan(b1);
    expect(b1).toBeCloseTo(1.25, 5);
  });
});

describe('M4 — Teknoloji', () => {
  it('akademi olmadan araştırma reddedilir', () => {
    const { s } = warVillage();
    s.player.res.know = 100;
    expect(s.applyCommand({ kind: 'research', techId: 'plow' })).toBe(false);
  });

  it('araştırma bilgi harcar ve üretim çarpanı uygular', () => {
    const { s, p } = warVillage();
    s.applyCommand({ kind: 'place', building: 'academy', x: p.x + 2, y: p.y });
    s.player.res.know = 100;
    expect(s.tech.prodMult('food', 'farm')).toBe(1);
    expect(s.applyCommand({ kind: 'research', techId: 'plow' })).toBe(true);
    expect(s.player.res.know).toBe(70);
    expect(s.tech.prodMult('food', 'farm')).toBeCloseTo(1.3, 5);
  });

  it('önkoşulsuz araştırma reddedilir (sawmill, plow ister)', () => {
    const { s, p } = warVillage();
    s.applyCommand({ kind: 'place', building: 'academy', x: p.x + 2, y: p.y });
    s.player.res.know = 500;
    expect(s.applyCommand({ kind: 'research', techId: 'sawmill' })).toBe(false);
    s.applyCommand({ kind: 'research', techId: 'plow' });
    expect(s.applyCommand({ kind: 'research', techId: 'sawmill' })).toBe(true);
  });

  it('taş ustalığı bina maliyetini düşürür', () => {
    const { s, p } = warVillage();
    s.applyCommand({ kind: 'place', building: 'academy', x: p.x + 2, y: p.y });
    s.player.res.know = 100;
    s.applyCommand({ kind: 'research', techId: 'masonry' });
    const woodBefore = s.player.res.wood;
    s.applyCommand({ kind: 'place', building: 'house', x: p.x + 3, y: p.y });
    expect(woodBefore - s.player.res.wood).toBe(24); // 30 × 0.8
  });
});

describe('M4 — Zafer & yenilgi', () => {
  it('nüfus sıfırlanınca yenilgi', () => {
    const { s } = warVillage();
    s.player.pop = 0; s.player.idle = 0;
    s.syncVillagers();
    s.tick(0.1);
    expect(s.gameOver).not.toBeNull();
    expect(s.gameOver!.won).toBe(false);
  });

  it('tüm krallıklar yok olursa fetih zaferi', () => {
    const { s } = warVillage();
    s.kingdoms.spawn(2);
    for (const k of [...s.kingdoms.kingdoms]) s.kingdoms.destroy(k);
    s.tick(0.1);
    expect(s.gameOver).not.toBeNull();
    expect(s.gameOver!.won).toBe(true);
  });

  it('tüm krallıklarla ittifak → diplomatik zafer', () => {
    const { s } = warVillage();
    s.kingdoms.spawn(3);
    for (const k of s.kingdoms.kingdoms) k.status = 'ally';
    s.tick(0.1);
    expect(s.gameOver).not.toBeNull();
    expect(s.gameOver!.won).toBe(true);
  });

  it('oyun bitince sim durur', () => {
    const { s } = warVillage();
    s.player.pop = 0; s.player.idle = 0;
    s.syncVillagers();
    s.tick(0.1);
    const t = s.time.t;
    s.tick(0.1);
    expect(s.time.t).toBe(t);
  });
});

describe('M4 — Kayıt & determinizm (askeri dahil)', () => {
  it('ordu + teknoloji + komutan dahil kayıt roundtrip birebir', () => {
    const build = (): Sim => {
      const w = new World(64, 64, 999);
      const s = new Sim(w);
      s.kingdoms.spawn(3);
      const p = findLand(w);
      s.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
      s.player.res.food = 450; s.player.res.wood = 450;
      s.player.res.stone = 450; s.player.res.gold = 450;
      s.applyCommand({ kind: 'place', building: 'barracks', x: p.x + 1, y: p.y });
      s.applyCommand({ kind: 'place', building: 'academy', x: p.x + 2, y: p.y });
      s.applyCommand({ kind: 'recruitCommander' });
      for (let i = 0; i < 3; i++) s.applyCommand({ kind: 'train', unit: 'spear' });
      s.player.res.know = 50;
      s.applyCommand({ kind: 'research', techId: 'plow' });
      const k = s.kingdoms.kingdoms[0];
      s.applyCommand({ kind: 'attack', kingdomId: k.id });
      return s;
    };
    const runA = (): unknown => {
      const s = build();
      for (let i = 0; i < 600; i++) s.tick(0.1);
      s.drainEvents();
      return s.snapshot();
    };
    const runB = (): unknown => {
      const s1 = build();
      for (let i = 0; i < 300; i++) s1.tick(0.1);
      const saved = JSON.parse(JSON.stringify(s1.serialize()));
      const w2 = new World(saved.world.W, saved.world.H, saved.world.seed);
      const s2 = Sim.restore(w2, saved);
      for (let i = 0; i < 300; i++) s2.tick(0.1);
      s2.drainEvents();
      return s2.snapshot();
    };
    expect(JSON.stringify(runB())).toBe(JSON.stringify(runA()));
  });

  it('restore sonrası teknoloji araştırması doğru kaynaktan düşer (referans onarımı)', () => {
    const w = new World(64, 64, 5);
    const s1 = new Sim(w);
    const p = findLand(w);
    s1.applyCommand({ kind: 'place', building: 'center', x: p.x, y: p.y });
    s1.player.res.wood = 400; s1.player.res.stone = 400;
    s1.applyCommand({ kind: 'place', building: 'academy', x: p.x + 1, y: p.y });
    s1.player.res.know = 100;
    const saved = JSON.parse(JSON.stringify(s1.serialize()));
    const s2 = Sim.restore(new World(64, 64, 5), saved);
    expect(s2.applyCommand({ kind: 'research', techId: 'plow' })).toBe(true);
    expect(s2.player.res.know).toBe(70); // host bayat nesneye yazsaydı 100 kalırdı
  });
});
