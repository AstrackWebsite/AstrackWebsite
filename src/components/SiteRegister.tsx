"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInStaff, signOutEntry } from "@/app/(app)/projects/actions";
import { formatTime } from "@/lib/format";

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
}

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

  const onSignIn = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await signInStaff(projectId, selected);
      if (res?.error) setError(res.error);
      else {
        setSelected("");
        router.refresh();
      }
    });
  };

  const onSignOut = (entryId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await signOutEntry(entryId, projectId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  // Day can be closed only when every non-blocked person has checked out.
  const stillOnSite = rows.filter((r) => !r.blocked && !r.checkOut).length;

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Site Register · Today
      </h2>

      <ul className="mb-4 divide-y divide-surface-border">
        {rows.length === 0 && (
          <li className="py-3 text-sm text-ink-muted">No one signed in yet.</li>
        )}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">
                {r.name}{" "}
                <span className="text-xs font-normal text-ink-faint">
                  {r.roleShort}
                </span>
              </p>
              {r.blocked ? (
                <p className="text-sm font-semibold text-danger-600">
                  BLOCKED · {r.blockReason}
                </p>
              ) : (
                <p className="text-sm text-ink-muted">
                  In {formatTime(r.checkIn)}
                  {r.checkOut && ` · Out ${formatTime(r.checkOut)}`}
                </p>
              )}
            </div>

            {r.blocked ? (
              <span className="pill pill-danger shrink-0">Blocked</span>
            ) : r.checkOut ? (
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
        ))}
      </ul>

      {/* Sign-in control */}
      {available.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="field flex-1"
            aria-label="Select staff to sign in"
          >
            <option value="">+ Sign in staff…</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.roleShort}
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

      {/* Day-close gate */}
      <div className="mt-5 border-t border-surface-border pt-4">
        <button
          type="button"
          disabled={stillOnSite > 0}
          className="btn-primary w-full disabled:opacity-50"
          title={
            stillOnSite > 0
              ? "Everyone must be signed out first"
              : "Closeout arrives in Phase E"
          }
        >
          End Day &amp; Sign Off
        </button>
        <p className="mt-2 text-center text-xs text-ink-muted">
          {stillOnSite > 0
            ? `${stillOnSite} still on site — sign everyone out to close the day.`
            : "Full day sign-off & closeout pack arrive in Phase E."}
        </p>
      </div>
    </section>
  );
}
