/* ============================================================
   TEKRAR TESTLERİ — lockstep kanıtı:
   tohum + komut listesi = birebir aynı oyun.
   Bot 8 dakika oynar (yüzlerce komut, savaşlar, felaketler);
   sonra oyun YALNIZ komut listesinden yeniden koşulur ve son
   durum karşılaştırılır.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { setupGame, runReplay, parseReplay, REPLAY_VERSION, type ReplayData } from '../core/replay';
import { autoplay } from './autoplay';

describe('Tekrar (replay) — çok oyunculu hazırlık', () => {
  it('komutsuz dünya: aynı kuruluş iki kez birebir aynı', () => {
    const a = setupGame(99, 96, 96, 4).sim;
    const b = setupGame(99, 96, 96, 4).sim;
    for (let i = 0; i < 600; i++) { a.tick(0.1); b.tick(0.1); }
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });

  it('8 dk bot oyunu komut listesinden BİREBİR yeniden üretilir', () => {
    const seed = 21;
    const { sim, spot } = setupGame(seed, 96, 96, 4);
    sim.cmdLog = []; // kayıt aç
    // meydan (bot kuruluşun kalanını oynar)
    let ok = sim.applyCommand({ kind: 'place', building: 'center', x: spot.x, y: spot.y });
    if (!ok) {
      outer:
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          ok = sim.applyCommand({ kind: 'place', building: 'center', x: spot.x + dx, y: spot.y + dy });
          if (ok) break outer;
        }
      }
    }
    expect(ok).toBe(true);
    autoplay(sim, 8, seed);
    expect(sim.cmdLog.length).toBeGreaterThan(25); // gerçekten oynadı

    // tekrar dosyası (JSON'dan geçir — gerçek dosya akışı gibi)
    const data: ReplayData = {
      rv: REPLAY_VERSION, seed, W: 96, H: 96, kingdoms: 4,
      ticks: sim.tickCount, entries: sim.cmdLog,
    };
    const parsed = parseReplay(JSON.stringify(data));
    expect(parsed).not.toBeNull();

    const sim2 = runReplay(parsed!);
    expect(sim2.tickCount).toBe(sim.tickCount);
    expect(JSON.stringify(sim2.snapshot())).toBe(JSON.stringify(sim.snapshot()));
  });

  it('bozuk/eski tekrar dosyası reddedilir', () => {
    expect(parseReplay('{}')).toBeNull();
    expect(parseReplay('bozuk')).toBeNull();
    expect(parseReplay(JSON.stringify({ rv: 999, seed: 1, W: 64, ticks: 0, entries: [] }))).toBeNull();
  });
});
