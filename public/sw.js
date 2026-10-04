/* Minimal service worker — нужен для установки PWA в Chrome/Edge. */
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
    /* Сетевые запросы обрабатывает браузер как обычно. */
});
