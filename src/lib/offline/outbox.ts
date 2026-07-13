"use client";

// Offline outbox.
// -----------------------------------------------------------------------------
// On-site work happens with no signal. When a save can't reach the server it is
// stored here on the device and replayed automatically when connectivity
// returns — so nothing entered on site is ever lost. Backed by localStorage
// (small JSON records, survives reloads and app restarts).

const KEY = "astrack.outbox.v1";
const EVENT = "astrack-outbox-change";

export type OutboxKind =
  | "exposure"
  | "signin"
  | "signout"
  | "plant_check"
  | "site_log"
  | "visitor_in"
  | "visitor_out";

export interface OutboxItem {
  id: string;
  kind: OutboxKind;
  projectId: string;
  /** Flat field map matching the server insert. */
  payload: Record<string, string | number | null>;
  createdAt: number;
}

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Queue a save for later. Returns the created item. */
export function enqueue(
  kind: OutboxKind,
  projectId: string,
  payload: Record<string, string | number | null>
): OutboxItem {
  const item: OutboxItem = {
    id: newId(),
    kind,
    projectId,
    payload,
    createdAt: Date.now(),
  };
  write([...read(), item]);
  return item;
}

export function all(): OutboxItem[] {
  return read();
}

/** Merge a patch into a queued item's payload (e.g. sign out a pending sign-in). */
export function updateItem(id: string, patch: Record<string, string | number | null>) {
  const items = read();
  const next = items.map((i) =>
    i.id === id ? { ...i, payload: { ...i.payload, ...patch } } : i
  );
  write(next);
}

export function count(): number {
  return read().length;
}

export function remove(ids: string[]) {
  if (ids.length === 0) return;
  const set = new Set(ids);
  write(read().filter((i) => !set.has(i.id)));
}

/** Subscribe to queue changes (in this tab and across tabs). Returns cleanup. */
export function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}
