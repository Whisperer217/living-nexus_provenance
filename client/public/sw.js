/**
 * Living Nexus — Service Worker
 * Cache-first strategy for static shell; network-first for API calls.
 * Enables basic offline support and home screen install on Android & iOS.
 */

const CACHE_NAME = "living-nexus-v1";

// Core app shell resources to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API/tRPC calls, cache-first for everything else
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to network for API calls, OAuth, and external CDN
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/api/trpc") ||
    url.hostname.includes("cloudfront.net") ||
    url.hostname.includes("manus.im")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful GET responses
        if (
          !response ||
          response.status !== 200 ||
          response.type === "opaque" ||
          request.method !== "GET"
        ) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Offline fallback: return cached root for navigation requests
        if (request.mode === "navigate") {
          return caches.match("/");
        }
      });
    })
  );
});
