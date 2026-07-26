/* ============================================================
   KALICILIK (MVP) — localStorage otomatik kayıt.
   "Her açtığında kaldığın yerden devam" temeli (docs/10-KAYIT).
   Faz 3'te IndexedDB + slotlar + çevrimdışı ilerlemeye genişleyecek.
   ============================================================ */
import { World } from '../core/world';
import { Sim, SAVE_VERSION } from '../core/sim';

const KEY = 'kralliklar_cagi_save';

export interface SaveMeta {
  seed: number;
  W: number;
  H: number;
  year: number;
  pop: number;
}

export function saveNow(sim: Sim): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(sim.serialize()));
    return true;
  } catch {
    return false; // depo dolu/kapalı — sessizce geç
  }
}

export function hasSave(): boolean {
  return loadRaw() !== null;
}

export function saveMeta(): SaveMeta | null {
  const d = loadRaw();
  if (!d) return null;
  return {
    seed: d.world.seed, W: d.world.W, H: d.world.H,
    year: d.time?.year ?? 1,
    pop: d.player?.pop ?? 0,
  };
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* yoksay */ }
}

/** Kayıttan dünya + sim'i geri kur. Bozuksa null. */
export function restoreGame(): { world: World; sim: Sim } | null {
  const d = loadRaw();
  if (!d) return null;
  try {
    const world = new World(d.world.W, d.world.H, d.world.seed);
    const sim = Sim.restore(world, d);
    return { world, sim };
  } catch {
    return null; // bozuk kayıt — yeni oyuna düş
  }
}

interface RawSave {
  v: number;
  world: { seed: number; W: number; H: number };
  time?: { year: number };
  player?: { pop: number };
  [k: string]: unknown;
}

function loadRaw(): RawSave | null {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const d = JSON.parse(s) as RawSave;
    if (d.v !== SAVE_VERSION) return null; // eski sürüm — migrasyon Faz 3'te
    return d;
  } catch {
    return null;
  }
}
