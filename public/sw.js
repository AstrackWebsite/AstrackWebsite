// AsTrack service worker.
// Deliberately conservative: it caches only immutable build assets (JS/CSS/
// fonts/images) so the app loads fast and survives brief signal drops. It never
// caches HTML pages or API responses — those always hit the network — so a
// shared site device can never show one user's logged-in data to the next.

const STATIC_CACHE = "astrack-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(css|js|woff2?|png|jpe?g|svg|webp|ico|webmanifest)$/.test(url.pathname);
  if (!isStatic) return; // HTML + API always go to the network

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return cached || Response.error();
      }
    })()
  );
});
