"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInStaff, signOutEntry } from "@/app/(app)/projects/actions";
import { formatTime, todayISO } from "@/lib/format";
import { enqueue, updateItem } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";

export interface RegisterRow {
  id: string;
  staffId: string;
  name: string;
  roleShort: string;
  blocked: boolean;
  blockReason: string | null;
  checkIn: string | null;
  checkOut: string | null;
}

export interface AvailableStaff {
  id: string;
  name: string;
  roleShort: string;
  blocked: boolean;
  blockReason: string | null;
}

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export function SiteRegister({
  projectId,
  rows,
  available,
}: {
  projectId: string;
  rows: RegisterRow[];
  available: AvailableStaff[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Pending register actions queued while offline.
  const queued = useOutbox(projectId, ["signin", "signout"]);
  const pendingSignins = queued.filter((i) => i.kind === "signin");
  const pendingSignoutIds = new Set(
    queued.filter((i) => i.kind === "signout").map((i) => String(i.payload.entry_id))
  );
  const availById = new Map(available.map((s) => [s.id, s]));
  const pendingStaffIds = new Set(pendingSignins.map((i) => String(i.payload.staff_id)));
  const selectable = available.filter((s) => !pendingStaffIds.has(s.id));

  const queueSignin = (staffId: string) =>
    enqueue("signin", projectId, {
      staff_id: staffId,
      entry_date: todayISO(),
      check_in: new Date().toISOString(),
    });

  const onSignIn = () => {
    if (!selected) return;
    setError(null);
    if (isOffline()) {
      queueSignin(selected);
      setSelected("");
      return;
    }
    startTransition(async () => {
      try {
        const res = await signInStaff(projectId, selected);
        if (res?.error) setError(res.error);
        else {
          setSelected("");
          router.refresh();
        }
      } catch {
        queueSignin(selected);
        setSelected("");
      }
    });
  };

  const onSignOut = (entryId: string) => {
    setError(null);
    if (isOffline()) {
      enqueue("signout", projectId, { entry_id: entryId, check_out: new Date().toISOString() });
      return;
    }
    startTransition(async () => {
      try {
        const res = await signOutEntry(entryId, projectId);
        if (res?.error) setError(res.error);
        else router.refresh();
      } catch {
        enqueue("signout", projectId, { entry_id: entryId, check_out: new Date().toISOString() });
      }
    });
  };

  // Sign out a person who was only signed in offline (still in the outbox).
  const onSignOutPending = (itemId: string) =>
    updateItem(itemId, { check_out: new Date().toISOString() });

  const stillOnSite = rows.filter((r) => !r.blocked && !r.checkOut && !pendingSignoutIds.has(r.id)).length;

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Site Register · Today
      </h2>

      <ul className="mb-4 divide-y divide-surface-border">
        {rows.length === 0 && pendingSignins.length === 0 && (
          <li className="py-3 text-sm text-ink-muted">No one signed in yet.</li>
        )}

        {rows.map((r) => {
          const signedOutPending = pendingSignoutIds.has(r.id);
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {r.name}{" "}
                  <span className="text-xs font-normal text-ink-faint">{r.roleShort}</span>
                </p>
                {r.blocked ? (
                  <p className="text-sm font-semibold text-danger-600">
                    BLOCKED · {r.blockReason}
                  </p>
                ) : (
                  <p className="text-sm text-ink-muted">
                    In {formatTime(r.checkIn)}
                    {r.checkOut && ` · Out ${formatTime(r.checkOut)}`}
                    {signedOutPending && !r.checkOut && " · signing out (pending)"}
                  </p>
                )}
              </div>

              {r.blocked ? (
                <span className="pill pill-danger shrink-0">Blocked</span>
              ) : r.checkOut || signedOutPending ? (
                <span className="pill pill-neutral shrink-0">Signed out</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSignOut(r.id)}
                  disabled={pending}
                  className="btn-secondary shrink-0 px-3 py-2 text-sm"
                >
                  Sign out
                </button>
              )}
            </li>
          );
        })}

        {/* Optimistic rows for people signed in while offline */}
        {pendingSignins.map((item) => {
          const s = availById.get(String(item.payload.staff_id));
          const signedOut = Boolean(item.payload.check_out);
          const blocked = s?.blocked;
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {s?.name ?? "Staff"}{" "}
                  <span className="text-xs font-normal text-ink-faint">{s?.roleShort}</span>
                </p>
                {blocked ? (
                  <p className="text-sm font-semibold text-danger-600">
                    BLOCKED · {s?.blockReason}
                  </p>
                ) : (
                  <p className="text-sm text-ink-muted">
                    {signedOut ? "Signed in & out" : "On site"} · pending sync
                  </p>
                )}
              </div>
              {blocked ? (
                <span className="pill pill-danger shrink-0">Blocked</span>
              ) : signedOut ? (
                <span className="pill pill-warn shrink-0">Pending</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSignOutPending(item.id)}
                  className="btn-secondary shrink-0 px-3 py-2 text-sm"
                >
                  Sign out
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Sign-in control */}
      {selectable.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="field flex-1"
            aria-label="Select staff to sign in"
          >
            <option value="">+ Sign in staff…</option>
            {selectable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.roleShort}
                {s.blocked ? " (blocked)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onSignIn}
            disabled={!selected || pending}
            className="btn-primary px-4 py-2 text-sm"
          >
            Sign in
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </section>
  );
}
