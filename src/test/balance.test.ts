/* ============================================================
   DENGE TURU — otomatik oyuncu gerçek başlangıç koşullarında
   25 dakika oynar; ekonomi→ordu→fetih eğrisi ölçülür.
   Eşikler "oyun iyi hissettirsin" hedefleridir:
   - Makul oyunla İLK 10 DK'da açlıktan ölüm olmamalı
   - Ekmek zinciri ~15 dk içinde kurulabilmeli
   - 20'lik ordu ~20 dk içinde toplanabilmeli
   - 25 dk içinde en az bir saldırı yapılabilmeli
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { World } from '../core/world';
import { Sim } from '../core/sim';
import { autoplay, type BalanceReport } from './autoplay';

function startRealGame(seed: number): Sim {
  const w = new World(128, 128, seed);
  const s = new Sim(w);
  s.kingdoms.spawn(6);
  s.wildlife.spawn();
  const spot = s.pickStartRegion();
  s.revealStartArea(spot.x, spot.y, 25);
  // gerçek açılış: meydan yerleştirilir, şantiye normal süresinde biter
  if (!s.applyCommand({ kind: 'place', building: 'center', x: spot.x, y: spot.y })) {
    // başlangıç noktası doluysa yakın kare dene
    outer:
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (s.applyCommand({ kind: 'place', building: 'center', x: spot.x + dx, y: spot.y + dy })) break outer;
      }
    }
  }
  return s;
}

const fmt = (r: BalanceReport): string =>
  `tohum ${r.seed} | tarla ${r.tFarmReady}dk · ekmek ${r.tBread}dk · ordu20 ${r.tArmy20}dk`
  + ` · ilk saldırı ${r.tFirstAttack}dk · ilk fetih ${r.tFirstConquest}dk`
  + ` | açlık ${r.starved} · akın ${r.raids} · yangın ${r.fires} · saldırı ${r.attacks}`
  + ` | son: 👥${r.endPop} ⚔️${r.endArmy} 🍞${r.endFood} · kalan krallık ${r.kingdomsLeft}`
  + (r.gameOver ? ` · ${r.gameOver}` : '') + '\n  binalar: ' + (r.debug ?? '');

describe('Denge turu — otomatik oyuncu (25 dk)', () => {
  const seeds = [7, 21];
  for (const seed of seeds) {
    it(`tohum ${seed}: eğri hedefleri tutuyor`, () => {
      const s = startRealGame(seed);
      const r = autoplay(s, 25, seed);
      console.log('[DENGE]', fmt(r));

      expect(r.gameOver === 'YENİLGİ').toBe(false);      // bot ölmemeli
      expect(r.tFarmReady).not.toBeNull();               // ekonomi kuruldu
      expect(r.tFarmReady!).toBeLessThan(3);             // tarla ilk 3 dk'da
      expect(r.tBread).not.toBeNull();                   // zincir kuruldu
      expect(r.tBread!).toBeLessThan(15);
      expect(r.tArmy20).not.toBeNull();                  // ordu toplandı
      expect(r.tArmy20!).toBeLessThan(20);
      expect(r.attacks).toBeGreaterThan(0);              // fetih girişimi var
      expect(r.endPop).toBeGreaterThan(5);               // köy büyüdü
    });
  }
});
