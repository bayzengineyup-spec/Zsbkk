/* Test yardımcıları — Faz 1'den itibaren inşaat SÜRELİ olduğu için
   testler şantiyeleri anında tamamlamak isteyebilir. */
import { World } from '../core/world';
import { Sim } from '../core/sim';
import type { UnitKey } from '../data/units';
import { isWater } from '../data/biomes';

/** Tüm şantiyeleri bitir (ihmal edilebilir 1e-6 sn'lik tek tick). */
export function completeAll(s: Sim): void {
  for (const b of s.player.buildings) {
    if (b.buildLeft !== undefined) b.buildLeft = 1e-9;
  }
  s.tick(1e-6);
}

/** Kur + anında tamamla. */
export function buildInstant(
  s: Sim, type: Parameters<Sim['canPlaceOn']>[0], x: number, y: number,
): boolean {
  const ok = s.applyCommand({ kind: 'place', building: type, x, y });
  if (ok) completeAll(s);
  return ok;
}

/** n asker eğit (kuyruğu işleterek) ve kuyruk boşalana dek bekle. */
export function trainMany(s: Sim, unit: UnitKey, n: number): void {
  for (let i = 0; i < n; i++) {
    let guard = 0;
    while (!s.applyCommand({ kind: 'train', unit })) {
      s.tick(1);
      if (++guard > 200) throw new Error('eğitim ilerlemiyor');
    }
  }
  let guard = 0;
  while (s.player.buildings.some(b => (b.queue?.length ?? 0) > 0)) {
    s.tick(0.5);
    if (++guard > 2000) throw new Error('kuyruk boşalmadı');
  }
}

export function findLand(w: World): { x: number; y: number } {
  for (let y = 12; y < w.H - 12; y++) {
    for (let x = 12; x < w.W - 12; x++) {
      if (!isWater(w.tiles[w.idx(x, y)])) return { x, y };
    }
  }
  throw new Error('kara bulunamadı');
}
