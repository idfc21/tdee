const CACHE_NAME = 'tdee-tracker-cache-v1';

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A standard pass-through fetch handler that satisfies mobile PWA requirements
self.addEventListener('fetch', (event) => {
  // Pass straight to database/network requests securely
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
