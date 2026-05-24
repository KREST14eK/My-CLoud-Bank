// Минимальный рабочий Service Worker для PWA
const CACHE_NAME = 'gcoin-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Установка — кэшируем основные файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // активируем сразу
});

// Перехват запросов — стратегия "сеть сначала, потом кэш"
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Очистка старых кэшей при активации
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});
