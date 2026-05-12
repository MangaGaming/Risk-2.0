const CACHE_NAME = 'risk-v2';
const ASSETS = [
  './src/html/index.html',
  './src/css/style.css',
  './src/assets/risk_board_real.svg',
  './src/js/config.js',
  './src/js/state.js',
  './src/js/utils.js',
  './src/js/p2p.js',
  './src/js/diplo.js',
  './src/js/game.js',
  './src/js/ui.js',
  './src/js/main.js',
  './manifest.json',
  './src/assets/icon-192.png',
  './src/assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
