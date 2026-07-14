// The AsTrack service worker, served dynamically so its bytes change on every
// deploy (the BUILD_ID is embedded). That's what lets an installed PWA notice a
// new version and offer a one-tap update, instead of silently serving stale
// code. It still caches only immutable build assets — never HTML or API — so a
// shared site device can't leak one user's logged-in data to the next.

export const dynamic = "force-dynamic";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

const SW = /* js */ `
const STATIC_CACHE = "astrack-static-${BUILD_ID}";

self.addEventListener("install", () => {
  // Activate the new version as soon as it's installed so devices never get
  // stuck on stale code. The page decides *when* to reload onto it (deferred
  // until the user isn't mid-edit), so this doesn't interrupt data entry.
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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
    /\\.(css|js|woff2?|png|jpe?g|svg|webp|ico|webmanifest)$/.test(url.pathname);
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
`;

export async function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Never let the browser cache the SW script itself, so update checks are
      // always fresh; the SW controls scope "/".
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
