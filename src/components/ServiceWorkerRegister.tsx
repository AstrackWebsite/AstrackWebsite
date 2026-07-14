"use client";

import { useEffect, useState } from "react";

// Registers the service worker and keeps the installed PWA on the latest code.
// New versions activate automatically (the SW skips waiting), and the page
// reloads onto them — but only when it won't interrupt the user: if they're
// mid-edit we defer the reload until they're not typing or step away, and offer
// a one-tap "update now" in the meantime.
export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;
    let reloaded = false;
    let deferred = false;

    const isEditing = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const doReload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    // A new version has taken control. Reload onto it now if it's safe;
    // otherwise wait until the user isn't mid-edit.
    const onControllerChange = () => {
      if (!isEditing()) doReload();
      else {
        deferred = true;
        setUpdateReady(true);
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((r) => {
        reg = r;
      })
      .catch(() => {
        /* offline caching just won't be available — not fatal */
      });

    // Check for a new version whenever the app is opened/resumed, and apply any
    // deferred update at a natural break (tab hidden, or returned and idle).
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (deferred) doReload();
        return;
      }
      reg?.update().catch(() => {});
      if (deferred && !isEditing()) doReload();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-navy-700 bg-navy-800 px-4 py-3 text-white shadow-lg">
      <span className="text-sm font-medium">
        A new version of AsTrack is ready.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-800 active:opacity-80"
      >
        Update now
      </button>
    </div>
  );
}
