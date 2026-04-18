// Bump esse número a cada deploy que mexe na estratégia de cache.
// v5: corrige chunk-load failures após deploy — index.html nunca é cacheado
// e assets hashados ganham fallback de rede quando o cache não bate.
const CACHE_NAME = 'kora-v5';
const STATIC_ASSETS = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const API_CACHE = 'kora-api-v1';

// Install: pre-cache APENAS arquivos estáticos imutáveis.
// Não cacheamos rotas HTML (/, /app, /login) — elas precisam ser sempre frescas
// pra apontar pros chunks JS atuais (com hash) gerados no último build.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpa caches antigos e assume controle das abas abertas.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Navigation (HTML): network-first, NUNCA serve HTML cacheado em rede normal
//   (só como fallback de offline puro). Senão o usuário vê index.html velho
//   apontando pra chunks que não existem mais → "Failed to fetch dynamically
//   imported module".
// - Assets hashados (/assets/foo-HASH.js): cache-first com fallback de rede
//   atualizando o cache em background (stale-while-revalidate).
// - Outros .js/.css/imagens: network-first com fallback pro cache.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Skip OAuth, Supabase API e extensões.
  if (url.pathname.includes('/~oauth') || url.hostname.includes('supabase')) return;

  // Navegação → network-first sem cachear o HTML.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(() => caches.match(e.request) || caches.match('/'))
    );
    return;
  }

  // Assets hashados pelo Vite (immutable) → stale-while-revalidate.
  // Esses arquivos têm hash no nome (ex: /assets/index-aB12cD.js), então
  // nunca conflitam entre versões. Pode cachear pra sempre — se o nome
  // mudar, é outro arquivo.
  const isHashedAsset =
    url.pathname.startsWith('/assets/') &&
    /-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpg|svg)$/.test(url.pathname);

  if (isHashedAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkPromise = fetch(e.request)
          .then(res => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            }
            return res;
          })
          .catch(() => cached); // se a rede falhar, usa o cache que já temos
        return cached || networkPromise;
      })
    );
    return;
  }

  // Outros estáticos (sem hash) → network-first, cache como fallback.
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?|json)$/)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
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

// Allow page to trigger immediate activation of new SW
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'KoraFinance';
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-badge-72.png',
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
