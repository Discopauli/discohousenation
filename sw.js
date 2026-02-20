// DHN Service Worker v9 — Always checks for fresh content
const CACHE_NAME = 'dhn-v9';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/logo.png',
  '/icons/logo-round.png',
  '/icons/discoball.svg',
];

// Install — cache app shell
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately, don't wait
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

// Activate — delete ALL old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Take control of all pages immediately
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never touch audio streams or netlify functions
  if (url.includes('citrus3.com') || url.includes('/8172/') || url.includes('radio.mp3') || url.includes('.netlify/functions/')) {
    return;
  }

  // Don't cache external resources (soundcloud, facebook, etc)
  if (!url.includes(self.location.origin)) {
    return;
  }

  // Network first — always try to get fresh content
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Got fresh content — update the cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache (offline support)
        return caches.match(event.request);
      })
  );
});
