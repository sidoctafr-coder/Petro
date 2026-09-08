const CACHE_NAME = 'souffleuse-diag-v1';
const ASSETS_TO_CACHE = [
  './',
  './graphiques.html',
  './index.html',
  './manifest.json',
  './js/db.js',
  './js/pareto.js',
  './js/typeDoughnut.js',
  './js/organesDoughnut.js',
  './js/chronologie.js',
  './js/libs/dexie.min.js',
  './js/libs/chart.umd.js'
];

// Installation : Mise en cache des fichiers
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : Nettoyage des anciens caches si mise à jour
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes : Servir depuis le cache si hors-ligne
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});