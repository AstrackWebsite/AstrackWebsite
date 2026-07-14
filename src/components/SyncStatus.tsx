"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { count, subscribe } from "@/lib/offline/outbox";
import { flushOutbox } from "@/lib/offline/sync";

// Header indicator: shows connectivity and how many saves are waiting on the
// device, and drives auto-sync when back online. Lives in the top bar so the
// crew can always see whether their data has reached the server.

export function SyncStatus() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(count());

    const refresh = () => setPending(count());
    const unsub = subscribe(refresh);

    const runSync = async () => {
      if (count() === 0) return;
      setSyncing(true);
      const { synced } = await flushOutbox();
      setSyncing(false);
      setPending(count());
      // Pull the freshly-synced rows into the page.
      if (synced > 0) router.refresh();
    };

    const goOnline = () => {
      setOnline(true);
      runSync();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Attempt a sync on mount (covers a reload while items are queued).
    runSync();
    // And periodically, as a backstop for flaky signal.
    const timer = window.setInterval(runSync, 30_000);

    return () => {
      unsub();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.clearInterval(timer);
    };
  }, [router]);

  // Nothing to say when online and fully synced — keep the bar clean.
  if (online && pending === 0 && !syncing) return null;

  const manualSync = async () => {
    setSyncing(true);
    const { synced } = await flushOutbox();
    setSyncing(false);
    setPending(count());
    if (synced > 0) router.refresh();
  };

  let label: string;
  let tone: string;
  if (!online) {
    label = pending > 0 ? `Offline · ${pending} to sync` : "Offline";
    tone = "bg-warn-100 text-warn-700";
  } else if (syncing) {
    label = "Syncing…";
    tone = "bg-navy-100 text-navy-700";
  } else {
    label = `${pending} to sync`;
    tone = "bg-navy-100 text-navy-700";
  }

  return (
    <button
      type="button"
      onClick={online ? manualSync : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
      title={
        online
          ? "Tap to sync now"
          : "You're offline — entries are saved on this device and will sync automatically"
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? "bg-ok-500" : "bg-warn-500"
        }`}
      />
      {label}
    </button>
  );
}
