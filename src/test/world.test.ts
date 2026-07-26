import { describe, it, expect } from 'vitest';
import { World, pickBiome } from '../core/world';
import { BIOMES, type BiomeId } from '../data/biomes';

describe('pickBiome (eşikler)', () => {
  it('alçak yükseklik su verir', () => {
    expect(pickBiome(0.1, 0.5, 0.5)).toBe('deep_water');
    expect(pickBiome(0.35, 0.5, 0.5)).toBe('water');
    expect(pickBiome(0.40, 0.5, 0.5)).toBe('shore');
  });
  it('çok yüksek yerler zirve/volkanik verir', () => {
    expect(pickBiome(0.95, 0.2, 0.5)).toBe('peak');
    expect(pickBiome(0.95, 0.6, 0.5)).toBe('volcanic');
    expect(pickBiome(0.85, 0.5, 0.5)).toBe('mountain');
  });
  it('sıcak-kuru çöl, sıcak-nemli orman verir', () => {
    expect(pickBiome(0.5, 0.8, 0.2)).toBe('desert');
    expect(pickBiome(0.5, 0.8, 0.9)).toBe('forest');
  });
  it('soğuk bölge tundra/kar verir', () => {
    expect(pickBiome(0.5, 0.1, 0.5)).toBe('tundra');
    expect(pickBiome(0.65, 0.1, 0.5)).toBe('snow');
  });
});

describe('World (deterministik dünya üretimi)', () => {
  it('aynı tohum + boyut → birebir aynı dünya', () => {
    const a = new World(64, 64, 424242);
    const b = new World(64, 64, 424242);
    expect(a.tiles).toEqual(b.tiles);
    expect(Array.from(a.height)).toEqual(Array.from(b.height));
    expect(a.res).toEqual(b.res);
  });

  it('farklı tohum → farklı dünya', () => {
    const a = new World(64, 64, 1);
    const b = new World(64, 64, 2);
    let diff = 0;
    for (let i = 0; i < a.tiles.length; i++) if (a.tiles[i] !== b.tiles[i]) diff++;
    expect(diff).toBeGreaterThan(a.tiles.length * 0.1);
  });

  it('makul bir kara/su dengesi vardır (ada maskesi çalışıyor)', () => {
    const w = new World(96, 96, 7);
    const total = w.tiles.length;
    const waterKinds = new Set<BiomeId>(['deep_water', 'water']);
    const water = w.tiles.filter(t => waterKinds.has(t)).length;
    const land = total - water;
    expect(land / total).toBeGreaterThan(0.15);
    expect(water / total).toBeGreaterThan(0.05); // kenarlar denize iner
  });

  it('tüm karolar geçerli biyom + 0..1 yükseklik taşır', () => {
    const w = new World(48, 48, 99);
    for (let i = 0; i < w.tiles.length; i++) {
      expect(BIOMES[w.tiles[i]]).toBeDefined();
      expect(w.height[i]).toBeGreaterThanOrEqual(0);
      expect(w.height[i]).toBeLessThanOrEqual(1);
    }
  });

  it('kaynaklar yalnızca biyomun izin verdiği yerde doğar', () => {
    const w = new World(96, 96, 5);
    let resCount = 0;
    for (let i = 0; i < w.tiles.length; i++) {
      const r = w.res[i];
      if (r !== null) {
        resCount++;
        expect(BIOMES[w.tiles[i]].res).toBe(r);
      }
    }
    expect(resCount).toBeGreaterThan(0); // ~%10 serpiştirme boş kalmamalı
  });

  it('idx / inBounds tutarlıdır', () => {
    const w = new World(32, 32, 3);
    expect(w.idx(0, 0)).toBe(0);
    expect(w.idx(31, 31)).toBe(32 * 32 - 1);
    expect(w.inBounds(0, 0)).toBe(true);
    expect(w.inBounds(31, 31)).toBe(true);
    expect(w.inBounds(-1, 0)).toBe(false);
    expect(w.inBounds(0, 32)).toBe(false);
  });
});
