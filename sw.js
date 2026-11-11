/* ══════════════════════════════════════
   Service Worker · Nosotros 💕
   Network-first con respaldo en caché:
   online = siempre fresco · offline = lo último guardado
   ══════════════════════════════════════ */
const CACHE = 'nosotros-v2';

const ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/ui.css',
  './css/home.css',
  './css/portal.css',
  './css/memories.css',
  './js/audio.js',
  './js/ui.js',
  './js/api.js',
  './js/home.js',
  './js/portal.js',
  './js/memories.js',
  './manifest.json',
  './foto-nuestra.jpg',
  './favicon.svg',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                    // nada de API
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // solo mismo origen
  if (url.pathname.startsWith('/api')) return;         // presencia siempre a red

  const isNav = req.mode === 'navigate';

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit || (isNav ? caches.match('./index.html') : Response.error())
        )
      )
  );
});
