"use client";

import { useEffect } from "react";

// Registers the service worker (static-asset caching + installability). No-ops
// where service workers aren't supported. Kept tiny and side-effect only.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline caching just won't be available — not fatal */
      });
    }
  }, []);
  return null;
}
