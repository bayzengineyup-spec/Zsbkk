/* ============================================================
   ÇEVRİMDIŞI İLERLEME — oyun kapalıyken köy kaba üretim yapar.
   Geçen süre DIŞARIDAN verilir (UI duvar saatinden hesaplar);
   bu fonksiyon verilen girdiyle tamamen deterministiktir ve RNG
   kullanmaz — determinizm/çok oyunculu hazırlığı bozulmaz.
   Bilinçli sade tutuldu (docs/10-KAYIT):
   - %50 verim, 8 saat tavan, 2 dakikadan azı yok sayılır
   - Zincir binaları (girdi tüketenler) çevrimdışı üretmez
   - Nüfus değişmez, olay/savaş işlemez, açlık ÖLDÜRMEZ
   ============================================================ */
import { BUILDINGS, type ResKey } from '../data/buildings';
import { isActive, type Sim } from './sim';

export const OFFLINE_EFF = 0.5;       // çevrimdışı verim
export const OFFLINE_CAP = 8 * 3600;  // en fazla 8 saat işlenir
export const OFFLINE_MIN = 120;       // 2 dk altı yok sayılır

export interface OfflineReport {
  /** işlenen süre (sn, tavana kırpılmış) */
  seconds: number;
  /** kaynak → gerçekleşen kazanç (depo tavanı sonrası) */
  gains: Array<[ResKey, number]>;
  /** halkın yediği yiyecek */
  eaten: number;
}

export function applyOfflineProgress(sim: Sim, elapsedSec: number): OfflineReport | null {
  const secs = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP);
  if (secs < OFFLINE_MIN || !sim.player.hasCenter || sim.gameOver) return null;
  const p = sim.player;

  // kaba üretim: yalnız girdisiz üreticiler, işçi × seviye × %50 verim
  const want = new Map<ResKey, number>();
  for (const b of p.buildings) {
    const def = BUILDINGS[b.type];
    if (!def.prod || def.input || b.workers <= 0 || b.burning || !isActive(b)) continue;
    for (const k of Object.keys(def.prod) as ResKey[]) {
      const g = (def.prod[k] ?? 0) * b.workers * b.level * OFFLINE_EFF * secs;
      if (g > 0) want.set(k, (want.get(k) ?? 0) + g);
    }
  }
  // uygula (depo tavanı) ve gerçekleşen kazancı raporla
  const gains: Array<[ResKey, number]> = [];
  for (const [k, g] of want) {
    const before = p.res[k];
    p.res[k] = Math.min(p.storageCap, p.res[k] + g);
    const real = Math.floor(p.res[k] - before);
    if (real >= 1) gains.push([k, real]);
  }
  // tüketim: kısık oran (uyuyan köy), eldekiyle sınırlı — kimse ölmez
  const eatWant = p.pop * 0.06 * 0.5 * secs;
  const eaten = Math.min(eatWant, p.res.food);
  p.res.food -= eaten;

  return { seconds: secs, gains, eaten: Math.floor(eaten) };
}
