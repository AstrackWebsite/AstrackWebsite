"use client";

import { all, remove } from "./outbox";

// Flushes the outbox to the server. Safe to call often — it no-ops when the
// queue is empty or the device is offline, and only clears items the server
// confirmed, so a failed batch is retried next time.

let inFlight = false;

export async function flushOutbox(): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { synced: 0, remaining: all().length };
  }
  if (inFlight) return { synced: 0, remaining: all().length };

  const items = all();
  if (items.length === 0) return { synced: 0, remaining: 0 };

  inFlight = true;
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) return { synced: 0, remaining: items.length };

    const data = (await res.json()) as {
      results: { id: string; ok: boolean }[];
    };
    const okIds = data.results.filter((r) => r.ok).map((r) => r.id);
    remove(okIds);
    return { synced: okIds.length, remaining: all().length };
  } catch {
    return { synced: 0, remaining: all().length };
  } finally {
    inFlight = false;
  }
}
