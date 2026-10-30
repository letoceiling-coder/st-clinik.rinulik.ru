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

self.addEventListener('push', (event) => {
    let data = { title: 'МирКлиник', body: '', url: '/' };
    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch {
        /* ignore malformed payload */
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            data: { url: data.url },
            icon: '/icons/icon-192.png',
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
            return undefined;
        }),
    );
});
