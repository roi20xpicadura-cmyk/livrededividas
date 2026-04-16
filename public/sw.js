const CACHE_NAME = 'kora-v3';
const STATIC_ASSETS = ['/', '/app', '/login', '/manifest.json', '/icon-192.png', '/icon-512.png'];
const API_CACHE = 'kora-api-v1';

// Install: pre-cache critical assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches, claim clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation, stale-while-revalidate for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip OAuth, Supabase API, and extension requests
  if (url.pathname.includes('/~oauth') || url.hostname.includes('supabase')) return;

  // Navigation: network first, fallback to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/app') || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }
});

// Background sync: retry failed mutations when online
self.addEventListener('sync', e => {
  if (e.tag === 'sync-transactions') {
    e.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // Placeholder for offline queue sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
}

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'KoraFinance';
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/app' },
    actions: data.actions || [],
    tag: data.tag || 'kora-notification',
    renotify: true,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/app';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
