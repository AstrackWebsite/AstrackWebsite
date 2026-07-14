"use client";

import { useEffect, useState } from "react";

// Registers the service worker and surfaces a one-tap "update" banner when a
// new version has been deployed. Essential for the installed PWA, which would
// otherwise keep serving stale code to on-site staff until they cleared storage.
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    // If a worker is already waiting (updated in a previous visit), prompt now.
    const promptIfWaiting = (r: ServiceWorkerRegistration) => {
      if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
    };

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((r) => {
        reg = r;
        promptIfWaiting(r);

        // A new worker started installing — watch it reach "installed".
        r.addEventListener("updatefound", () => {
          const nw = r.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(nw);
            }
          });
        });
      })
      .catch(() => {
        /* offline caching just won't be available — not fatal */
      });

    // Check for a new version whenever the app is opened/resumed — installed
    // PWAs often resume rather than cold-start, so this is where updates land.
    const checkForUpdate = () => reg?.update().catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);

    // When the new worker takes control, reload once to pick up fresh code.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-navy-700 bg-navy-800 px-4 py-3 text-white shadow-lg">
      <span className="text-sm font-medium">A new version of AsTrack is ready.</span>
      <button
        type="button"
        onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
        className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-800 active:opacity-80"
      >
        Update
      </button>
    </div>
  );
}
