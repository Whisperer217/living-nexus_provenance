/**
 * Living Nexus — Production Service Worker v5
 * ============================================
 * Strategy map:
 *   /api/**                  → Network First  (fresh data, cache fallback offline)
 *   JS/CSS/fonts/icons       → Cache First    (static bundles rarely change)
 *   audio (mp3/ogg/wav/m4a)  → Stale-While-Revalidate (instant playback + bg refresh)
 *   navigation (HTML)        → Network First, fallback → /offline.html
 *   everything else          → Network First
 *
 * Features:
 *   ✓ Versioned caches — old caches purged on activate
 *   ✓ skipWaiting + clientsClaim — instant activation on deploy
 *   ✓ Background sync — offline tip/upload queuing via IndexedDB
 *   ✓ Update detection — postMessage SW_UPDATED to all clients
 *   ✓ Branded offline page — /offline.html
 */

// ─── Version ─────────────────────────────────────────────────────────────────
// Bump CACHE_VERSION on every deploy to bust old caches.
const CACHE_VERSION  = "ln-v5";
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE  = `${CACHE_VERSION}-dynamic`;
const AUDIO_CACHE    = `${CACHE_VERSION}-audio`;
const OFFLINE_URL    = "/offline.html";

// Resources to pre-cache on install
const PRECACHE_URLS = ["/", "/offline.html", "/manifest.json"];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => { console.log(`[SW] Purging old cache: ${k}`); return caches.delete(k); })
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Notify all open tabs that a new version is live
        return self.clients.matchAll({ type: "window" }).then((clients) =>
          clients.forEach((c) =>
            c.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION })
          )
        );
      })
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|webp|ico|gif)(\?.*)?$/.test(url.pathname)
  );
}

function isAudioFile(url) {
  return (
    /\.(mp3|ogg|wav|m4a|flac|aac|opus|webm)(\?.*)?$/.test(url.pathname) ||
    /\.(mp3|ogg|wav|m4a|flac|aac|opus|webm)(\?.*)?$/.test(url.href) ||
    url.hostname.includes("amazonaws.com") ||
    url.hostname.includes("cloudfront.net")
  );
}

// ─── Network First ─────────────────────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request.clone());
    if (res && res.status === 200 && request.method === "GET") {
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return new Response("Offline — no cached response available.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// ─── Cache First ───────────────────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(STATIC_CACHE);
  try {
    const res = await fetch(request.clone());
    if (res && res.status === 200) cache.put(request, res.clone());
    return res;
  } catch {
    return new Response("Asset unavailable offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// ─── Stale While Revalidate ────────────────────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request.clone())
    .then((res) => {
      if (res && res.status === 200) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || fetchPromise;
}

// ─── Fetch Handler ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-http(s) schemes
  if (!["http:", "https:"].includes(url.protocol)) return;
  // Skip POST/PUT/DELETE — never cache mutations
  if (event.request.method !== "GET") return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }
  if (isAudioFile(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  // Navigation + everything else
  event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
});

// ─── Background Sync ───────────────────────────────────────────────────────────
// The frontend queues payloads in IndexedDB when offline, then calls
// navigator.serviceWorker.ready.then(sw => sw.sync.register("sync-tips"))
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tips") {
    event.waitUntil(replayQueue("ln-tip-queue"));
  }
  if (event.tag === "sync-uploads") {
    event.waitUntil(replayQueue("ln-upload-queue"));
  }
});

function replayQueue(storeName) {
  return new Promise((resolve, reject) => {
    const dbReq = indexedDB.open("ln-sync-db", 1);
    dbReq.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
    };
    dbReq.onsuccess = async (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) { resolve(); return; }
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const allReq = store.getAll();
      allReq.onsuccess = async () => {
        for (const item of allReq.result) {
          try {
            await fetch(item.url, {
              method: item.method || "POST",
              headers: item.headers || { "Content-Type": "application/json" },
              body: item.body,
              credentials: "include",
            });
            store.delete(item.id);
          } catch {
            // Still offline — leave in queue for next sync
          }
        }
        resolve();
      };
      allReq.onerror = reject;
    };
    dbReq.onerror = reject;
  });
}

// ─── Message Handler ───────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "SW_VERSION", version: CACHE_VERSION });
  }
});
