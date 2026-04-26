/* ============================================================
   ZANO HVAC PWA — Service Worker
   Offline-first caching with stale-while-revalidate for content
   ============================================================ */

const VERSION = 'zano-v1.0.0';
const STATIC_CACHE  = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE   = `${VERSION}-images`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/services.html',
  '/articles.html',
  '/about.html',
  '/contact.html',
  '/account.html',
  '/privacy-policy.html',
  '/cookie.html',
  '/offline.html',
  '/blog/maintenance-tips.html',
  '/blog/comfortable-home.html',
  '/assets/styles.css',
  '/assets/app.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/og-image.png',
];

/* ----------------------------------------------------------
   Install — pre-cache the shell
   ---------------------------------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS).catch(err => {
        console.warn('[SW] Some core assets failed to cache:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

/* ----------------------------------------------------------
   Activate — clean up old caches
   ---------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ----------------------------------------------------------
   Fetch — strategy router
   - HTML pages:  network-first, fall back to cache, then offline page
   - CSS/JS/manifest: stale-while-revalidate
   - Images: cache-first with runtime fill
   - Cross-origin (CDN logo, photos): cache-first
   ---------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isHTML  = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  const isImage = request.destination === 'image';
  const isAsset = ['style', 'script', 'manifest', 'font'].includes(request.destination);
  const isCrossOrigin = url.origin !== self.location.origin;

  if (isHTML) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isImage || isCrossOrigin) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }
  if (isAsset) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }
  // Default: try cache, then network
  event.respondWith(cacheFirst(request, RUNTIME_CACHE));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/offline.html');
    return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(fresh => {
    if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
    return fresh;
  }).catch(() => cached);
  return cached || fetchPromise;
}

/* ----------------------------------------------------------
   Background sync — try to send queued forms
   ---------------------------------------------------------- */
self.addEventListener('sync', (event) => {
  if (event.tag === 'zano-form-sync') {
    event.waitUntil(syncForms());
  }
});

async function syncForms() {
  // In production this would POST queued forms to a backend.
  // The queue sits in localStorage on the page side; SW cannot read it directly.
  // This is left as a hook for future server integration.
  console.log('[SW] Form sync triggered');
}

/* ----------------------------------------------------------
   Push notifications (placeholder for future use)
   ---------------------------------------------------------- */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'ZANO HVAC';
  const options = {
    body: data.body || 'You have an update from ZANO.',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-96.png',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
