/* ============================================================
   TEKRAR (REPLAY) — çok oyunculu hazırlığın ilk somut adımı.
   Oyun = dünya tohumu + başlangıç parametreleri + KOMUT LİSTESİ.
   Sim tamamen deterministik olduğundan aynı girdiler her makinede
   birebir aynı oyunu üretir (lockstep'in temeli).

   Kayıt: Sim.cmdLog açıkken her başarılı komut {tick, cmd} olarak
   birikir (komut, N. tick'ten sonra uygulanmıştır).
   Tekrar: aynı kuruluş sırası + komutlar aynı tick sınırlarında.
   ============================================================ */
import { World } from './world';
import { Sim, type Difficulty } from './sim';
import type { Command } from './commands';

export const REPLAY_VERSION = 1;
/** Sabit sim adımı — canlı döngüyle aynı (SIM_HZ = 10). */
export const REPLAY_STEP = 0.1;

export interface ReplayEntry { tick: number; cmd: Command; }

/** Başlangıç sissiz alan yarıçapı (Aşama 3 / G9: orta büyüklükte açık bölge). */
export const START_REVEAL = 42;

export interface ReplayData {
  rv: number;          // tekrar formatı sürümü
  seed: number;
  W: number;
  H: number;
  kingdoms: number;    // başlangıçta üretilen rakip sayısı
  ticks: number;       // koşulan toplam tick
  entries: ReplayEntry[];
  /** zorluk — sim davranışını etkiler, tekrara girmek zorunda */
  difficulty?: Difficulty;
}

/** Canlı oyunun kuruluş sırasını birebir tekrarlar (startGame ile AYNI). */
export function setupGame(
  seed: number, W: number, H: number, kingdomCount: number,
  difficulty: Difficulty = 'normal',
): { world: World; sim: Sim; spot: { x: number; y: number } } {
  const world = new World(W, H, seed);
  const sim = new Sim(world, difficulty);
  sim.kingdoms.spawn(kingdomCount);
  sim.wildlife.spawn();
  const spot = sim.pickStartRegion();
  sim.revealStartArea(spot.x, spot.y, START_REVEAL);
  return { world, sim, spot };
}

/** Tekrarı baştan sona (veya untilTick'e dek) koş; bitmiş sim'i döndür. */
export function runReplay(data: ReplayData, untilTick?: number): Sim {
  const { sim } = setupGame(data.seed, data.W, data.H, data.kingdoms, data.difficulty ?? 'normal');
  const end = Math.min(untilTick ?? data.ticks, data.ticks);
  let ei = 0;
  const applyAt = (tick: number): void => {
    while (ei < data.entries.length && data.entries[ei].tick === tick) {
      sim.applyCommand(data.entries[ei].cmd);
      ei++;
    }
  };
  for (let t = 0; t < end; t++) {
    applyAt(t);          // N. tick'ten sonra verilen komutlar (t=0: tick öncesi)
    sim.tick(REPLAY_STEP);
  }
  applyAt(end);          // son tick'ten sonra verilen komutlar
  return sim;
}

/** Tekrar dosyasını doğrula (kaba şema denetimi). */
export function parseReplay(json: string): ReplayData | null {
  try {
    const d = JSON.parse(json) as ReplayData;
    if (d.rv !== REPLAY_VERSION) return null;
    if (typeof d.seed !== 'number' || typeof d.W !== 'number'
      || typeof d.ticks !== 'number' || !Array.isArray(d.entries)) return null;
    return d;
  } catch {
    return null;
  }
}
