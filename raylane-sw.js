// Raylane Express Service Worker v2.0
const CACHE_NAME = 'raylane-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/pages/book.html',
  '/pages/account.html',
  '/manifest.json',
  '/assets/logo.png',
];

// Install — precache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) return;

  // API calls — network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML pages — network first, cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request) || caches.match(OFFLINE_URL))
    );
    return;
  }

  // Assets — cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Raylane Express', {
      body: data.body || 'Your trip update is ready.',
      icon: '/assets/icon-192.png',
      badge: '/assets/badge-96.png',
      tag: data.tag || 'raylane-alert',
      data: { url: data.url || '/' },
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view') {
    event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
  }
});
