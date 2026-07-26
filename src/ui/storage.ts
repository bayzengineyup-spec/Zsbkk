/* ============================================================
   DEPOLAMA KATMANI — IndexedDB (asıl) + localStorage (yedek).
   Tüm kayıtlar açılışta BELLEĞE alınır: oyun içi okuma senkron,
   yazma asenkron (beklenmez — oyun akışı takılmaz).
   localStorage'ın ~5MB sınırı yerine IndexedDB ile büyük dünyalar
   ve çoklu slot rahatça saklanır (docs/10-KAYIT · Faz 3).
   ============================================================ */

const DB_NAME = 'kralliklar-cagi';
const STORE = 'kv';
const LS_PREFIX = 'kc:';

let db: IDBDatabase | null = null;
let lsFallback = false;
const mem = new Map<string, string>();

/** Açılışta bir kez: IndexedDB'yi aç ve tüm kayıtları belleğe yükle.
    IndexedDB yoksa/başarısızsa localStorage yedeğine düşer. */
export async function initStorage(): Promise<void> {
  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = () => { rq.result.createObjectStore(STORE); };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error as Error);
      rq.onblocked = () => reject(new Error('blocked'));
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).openCursor();
      rq.onsuccess = () => {
        const cur = rq.result;
        if (cur) {
          mem.set(String(cur.key), String(cur.value));
          cur.continue();
        } else resolve();
      };
      rq.onerror = () => reject(rq.error as Error);
    });
  } catch {
    db = null;
    lsFallback = true;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(LS_PREFIX)) {
          const v = localStorage.getItem(k);
          if (v !== null) mem.set(k.slice(LS_PREFIX.length), v);
        }
      }
    } catch { /* depo tamamen kapalı — bellek içi devam (oturumluk) */ }
  }
}

export function kvGet(key: string): string | null {
  return mem.get(key) ?? null;
}

export function kvSet(key: string, val: string): void {
  mem.set(key, val);
  if (db) {
    try {
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
    } catch { /* yazım hatası — bellek güncel, sonraki yazımda tekrar denenir */ }
  } else if (lsFallback) {
    try { localStorage.setItem(LS_PREFIX + key, val); } catch { /* dolu */ }
  }
}

export function kvDel(key: string): void {
  mem.delete(key);
  if (db) {
    try {
      db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
    } catch { /* yoksay */ }
  } else if (lsFallback) {
    try { localStorage.removeItem(LS_PREFIX + key); } catch { /* yoksay */ }
  }
}
