const CACHE_NAME = 'hrustal-courier-v1';
const urlsToCache = [
  '/courier',
  '/manifest.json',
  // Добавьте другие ресурсы, которые нужно кешировать
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кешированную версию или загружаем с сервера
        return response || fetch(event.request);
      }
    )
  );
});

// Обновление Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});