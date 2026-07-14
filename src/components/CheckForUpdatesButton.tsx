"use client";

import { useState } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

type Status = "idle" | "checking" | "current";

// Manual "get the latest version" control. Every deploy changes the service
// worker's bytes, so asking it to update reliably surfaces a new build. When one
// is found we activate it (SKIP_WAITING); the controllerchange listener in
// ServiceWorkerRegister then reloads the app onto the fresh code.
export function CheckForUpdatesButton() {
  const [status, setStatus] = useState<Status>("idle");

  const applyWaiting = (reg: ServiceWorkerRegistration) => {
    reg.waiting?.postMessage({ type: "SKIP_WAITING" });
    // A controllerchange → reload is imminent (handled in ServiceWorkerRegister).
  };

  const check = async () => {
    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }
    setStatus("checking");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        window.location.reload();
        return;
      }
      await reg.update();

      if (reg.waiting) {
        applyWaiting(reg);
        return;
      }

      const installing = reg.installing;
      if (installing) {
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && reg.waiting) applyWaiting(reg);
        });
        return;
      }

      // No new worker — already on the latest build.
      setStatus("current");
    } catch {
      window.location.reload();
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={check}
        disabled={status === "checking"}
        className="btn-secondary w-full disabled:opacity-60"
      >
        {status === "checking" ? "Checking…" : "Check for updates"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-faint">
        {status === "current"
          ? "You're on the latest version."
          : `Version ${BUILD_ID.slice(0, 8)}`}
      </p>
    </div>
  );
}
