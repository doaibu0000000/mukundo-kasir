/* ==========================================================================
   sw.js — Service Worker for SURANTAKA POS (client-side / IndexedDB mode)

   Strategy
   --------
   * App shell (HTML/CSS/JS + icons + manifest): cached on first load so the
     UI can be opened OFFLINE. All data lives in IndexedDB, so the app works
     fully without network after the first load.
   * CDN resources (Tailwind, Chart.js, SweetAlert2, etc.): NOT same-origin,
     so the SW ignores them (the browser caches them normally).
   * No /api/ routes — all data is local (IndexedDB).

   Bump CACHE_VERSION whenever the shell changes to force clients to upgrade.
   ========================================================================== */
const CACHE_VERSION = "v2-2026-07-10";
const SHELL_CACHE = `pos-shell-${CACHE_VERSION}`;

/* Resources that make up the "app shell" — cached on install.
   All paths are RELATIVE so the SW works on GitHub Pages subdirectory. */
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./css/neu.css",
  "./js/db.js",
  "./js/backend.js",
  "./js/api.js",
  "./js/helpers.js",
  "./js/notify.js",
  "./js/state.js",
  "./js/theme.js",
  "./js/router.js",
  "./js/app.js",
  "./js/views/login.js",
  "./js/views/dashboard.js",
  "./js/views/products.js",
  "./js/views/categories.js",
  "./js/views/transaction.js",
  "./js/views/reports.js",
  "./js/views/settings.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

/* ------------------------------------------------------------------ install */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll fails entirely if one asset 404s; catch individually so a
      // missing optional asset doesn't break installation.
      Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn("[SW] skip caching", url, err.message)
          )
        )
      )
    )
  );
  self.skipWaiting();
});

/* ----------------------------------------------------------------- activate */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* -------------------------------------------------------------------- fetch */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* 1. Only handle same-origin GET requests. Ignore non-GET and cross-origin
        (CDN libs handle their own caching). */
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  /* 2. App shell: cache-first strategy (all data is in IndexedDB, so the
        shell IS the entire app). Serve from cache, update in background. */
  event.respondWith(_cacheFirst(req, SHELL_CACHE));
});

/* ------------------------------------------------------------------ helpers */
async function _cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    // Offline and not cached — for navigations, serve the cached index page
    if (req.mode === "navigate") {
      const fallback = await caches.match("./index.html");
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

/* --------------------------------------------- let the page trigger updates */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
