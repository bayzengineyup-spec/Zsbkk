/* ============================================================
   SERVICE WORKER — çevrimdışı açılış (PWA).
   Strateji:
   - Gezinme (sayfa): ağ öncelikli, çevrimdışıysa önbellekteki kabuk
   - Varlıklar (js/css/ikon): önbellek öncelikli + arka planda tazele
     (Vite varlık adları hash'li → eski sürüm çakışması olmaz)
   Oyun kayıtları IndexedDB'de — SW önbelleğinden bağımsız, güvende.
   ============================================================ */
const VERSION = 'kc-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // sayfa: ağ öncelikli → çevrimdışıysa kabuk
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put('/', copy));
          return r;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // varlık: önbellek öncelikli, arka planda tazele
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return r;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
