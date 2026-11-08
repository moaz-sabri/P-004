/**
 * Studio Planner - Service Worker
 * Enables offline PWA capability and local push notification interactions.
 */

const CACHE_NAME = "studio-planner-v2.2";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./projects.html",
  "./settings.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install: Pre-cache all core assets
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn("ServiceWorker pre-cache partial failure:", err);
      });
    })
  );
});

// Activate: Clean up previous outdated caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate with offline fallback
self.addEventListener("fetch", event => {
  // Only handle GET requests and local/http schemes
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback if offline
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Notification Click: focus or open the window
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = "./index.html#agenda";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
