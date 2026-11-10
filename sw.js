const CACHE_NAME = 'bmp-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/josabet.js',
  '/ranking-geral.js',
  '/bd/pontos-primeiro-turno.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Os dados da competição devem sempre vir da rede para refletir novas rodadas.
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.endsWith('/bd/cartola.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
