/* ============================================================
   KALICILIK v2 (Faz 3) — IndexedDB + 3 KAYIT SLOTU.
   - Kayıtlar storage.ts üzerinden IndexedDB'de (localStorage yedek)
   - Her kayda savedAt damgası eklenir → çevrimdışı ilerleme süresi
   - Eski tek-kayıt (localStorage) açılışta boş bir slota taşınır
   Not: Date.now yalnız bu UI katmanında kullanılır — sim'e girmez.
   ============================================================ */
import { World } from '../core/world';
import { Sim, SAVE_VERSION } from '../core/sim';
import { initStorage, kvGet, kvSet, kvDel } from './storage';

export const SLOT_COUNT = 3;
const LEGACY_KEY = 'kralliklar_cagi_save';
const slotKey = (i: number) => `save:${i}`;

let active = 0;
export function getActiveSlot(): number { return active; }
export function setActiveSlot(i: number): void {
  active = Math.max(0, Math.min(SLOT_COUNT - 1, i));
}

export interface SaveMeta {
  seed: number;
  W: number;
  H: number;
  year: number;
  pop: number;
  /** kaydın duvar saati damgası (ms) — eski kayıtlarda olmayabilir */
  savedAt: number | null;
}

/** UI'ye ait, sim dışı kayıt ekleri (öğretici ilerlemesi vb.). */
export interface UiExtras {
  tut?: { step: number; done: boolean; hidden: boolean };
}

/** Açılışta bir kez: depoyu başlat + eski tek-kayıt migrasyonu. */
export async function initPersist(): Promise<void> {
  await initStorage();
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      for (let i = 0; i < SLOT_COUNT; i++) {
        if (!kvGet(slotKey(i))) { kvSet(slotKey(i), legacy); break; }
      }
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch { /* localStorage kapalı — migrasyon atlanır */ }
}

export function saveNow(sim: Sim, ui?: UiExtras, slot = active): boolean {
  try {
    const data = sim.serialize() as Record<string, unknown>;
    if (ui) data.ui = ui;
    data.savedAt = Date.now();
    kvSet(slotKey(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Mevcut kaydı JSON metni olarak ver (dışa aktarma). */
export function exportSave(slot = active): string | null {
  return kvGet(slotKey(slot));
}

/** JSON metnini doğrulayıp kayıt olarak yükle (içe aktarma). */
export function importSave(json: string, slot = active): boolean {
  try {
    const d = JSON.parse(json) as RawSave;
    if (d.v !== SAVE_VERSION || !d.world?.seed) return false;
    kvSet(slotKey(slot), json);
    return true;
  } catch {
    return false;
  }
}

export function hasSave(slot = active): boolean {
  return loadRaw(slot) !== null;
}

export function saveMeta(slot = active): SaveMeta | null {
  const d = loadRaw(slot);
  if (!d) return null;
  return {
    seed: d.world.seed, W: d.world.W, H: d.world.H,
    year: d.time?.year ?? 1,
    pop: d.player?.pop ?? 0,
    savedAt: typeof d.savedAt === 'number' ? d.savedAt : null,
  };
}

export function clearSave(slot = active): void {
  kvDel(slotKey(slot));
}

/** Kayıttan dünya + sim'i geri kur. Bozuksa null.
    elapsedSec: kayıttan bu yana geçen gerçek süre (çevrimdışı ilerleme için). */
export function restoreGame(slot = active): {
  world: World; sim: Sim; ui: UiExtras; elapsedSec: number;
} | null {
  const d = loadRaw(slot);
  if (!d) return null;
  try {
    const world = new World(d.world.W, d.world.H, d.world.seed);
    const sim = Sim.restore(world, d);
    const elapsedSec = typeof d.savedAt === 'number'
      ? Math.max(0, (Date.now() - d.savedAt) / 1000)
      : 0;
    return { world, sim, ui: (d.ui as UiExtras) ?? {}, elapsedSec };
  } catch {
    return null; // bozuk kayıt — yeni oyuna düş
  }
}

interface RawSave {
  v: number;
  world: { seed: number; W: number; H: number };
  time?: { year: number };
  player?: { pop: number };
  ui?: unknown;
  savedAt?: unknown;
  [k: string]: unknown;
}

function loadRaw(slot: number): RawSave | null {
  try {
    const s = kvGet(slotKey(slot));
    if (!s) return null;
    const d = JSON.parse(s) as RawSave;
    if (d.v !== SAVE_VERSION) return null; // eski sürüm — sürüm migrasyonu ileride
    return d;
  } catch {
    return null;
  }
}
