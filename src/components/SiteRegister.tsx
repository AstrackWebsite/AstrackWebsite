"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInStaff, signOutEntry } from "@/app/(app)/projects/actions";
import { formatTime, todayISO } from "@/lib/format";
import { enqueue, updateItem } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";
import { RPE_OPTIONS } from "@/lib/exposureOptions";
import { blankChecklist, allChecked, type ChecklistItem } from "@/lib/registerChecklist";
import type { CertEvidenceItem } from "@/lib/compliance";

export interface RegisterRow {
  id: string;
  staffId: string;
  name: string;
  roleShort: string;
  blocked: boolean;
  blockReason: string | null;
  checkIn: string | null;
  checkOut: string | null;
  rpe: string | null;
  certs: CertEvidenceItem[];
}

export interface AvailableStaff {
  id: string;
  name: string;
  roleShort: string;
  blocked: boolean;
  blockReason: string | null;
  certs: CertEvidenceItem[];
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
  const [error, setError] = useState<string | null>(null);

  // Search + selection for the sign-in flow.
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(blankChecklist());
  const [rpe, setRpe] = useState("");

  // Expandable cert evidence per register row (HSE view).
  const [openCerts, setOpenCerts] = useState<Set<string>>(new Set());

  const queued = useOutbox(projectId, ["signin", "signout"]);
  const pendingSignins = queued.filter((i) => i.kind === "signin");
  const pendingSignoutIds = new Set(
    queued.filter((i) => i.kind === "signout").map((i) => String(i.payload.entry_id))
  );
  const availById = new Map(available.map((s) => [s.id, s]));
  const pendingStaffIds = new Set(pendingSignins.map((i) => String(i.payload.staff_id)));

  const selectable = available.filter((s) => !pendingStaffIds.has(s.id));
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? selectable.filter((s) => s.name.toLowerCase().includes(q)) : selectable;
    return list.slice(0, 20);
  }, [search, selectable]);

  const selected = selectedId ? availById.get(selectedId) : null;

  const openSignIn = (id: string) => {
    setSelectedId(id);
    setChecklist(blankChecklist());
    setRpe("");
    setError(null);
  };
  const closeSignIn = () => {
    setSelectedId(null);
    setError(null);
  };

  const doSignIn = () => {
    if (!selected) return;
    setError(null);
    const payloadChecklist = checklist;

    if (isOffline()) {
      enqueue("signin", projectId, {
        staff_id: selected.id,
        entry_date: todayISO(),
        check_in: new Date().toISOString(),
        checklist: JSON.stringify(payloadChecklist),
        rpe: rpe || null,
      });
      setSearch("");
      closeSignIn();
      return;
    }
    startTransition(async () => {
      try {
        const res = await signInStaff(projectId, selected.id, {
          checklist: payloadChecklist,
          rpe: rpe || null,
        });
        if (res?.error) setError(res.error);
        else {
          setSearch("");
          closeSignIn();
          router.refresh();
        }
      } catch {
        enqueue("signin", projectId, {
          staff_id: selected.id,
          entry_date: todayISO(),
          check_in: new Date().toISOString(),
          checklist: JSON.stringify(payloadChecklist),
          rpe: rpe || null,
        });
        setSearch("");
        closeSignIn();
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

  const onSignOutPending = (itemId: string) =>
    updateItem(itemId, { check_out: new Date().toISOString() });

  const toggleCerts = (id: string) =>
    setOpenCerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ready = allChecked(checklist) && rpe !== "";

  return (
    <div>
      <ul className="mb-4 divide-y divide-surface-border">
        {rows.length === 0 && pendingSignins.length === 0 && (
          <li className="py-3 text-sm text-ink-muted">No one signed in yet.</li>
        )}

        {rows.map((r) => {
          const signedOutPending = pendingSignoutIds.has(r.id);
          const showCerts = openCerts.has(r.id);
          return (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {r.name}{" "}
                    <span className="text-xs font-normal text-ink-faint">{r.roleShort}</span>
                  </p>
                  {r.blocked ? (
                    <p className="text-sm font-semibold text-danger-600">BLOCKED · {r.blockReason}</p>
                  ) : (
                    <p className="text-sm text-ink-muted">
                      In {formatTime(r.checkIn)}
                      {r.checkOut && ` · Out ${formatTime(r.checkOut)}`}
                      {signedOutPending && !r.checkOut && " · signing out (pending)"}
                      {r.rpe && ` · ${r.rpe}`}
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
              </div>

              {r.certs.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleCerts(r.id)}
                    className="mt-1 text-xs font-medium text-accent-700"
                  >
                    {showCerts ? "Hide certificates" : "Show certificates (HSE)"}
                  </button>
                  {showCerts && <CertEvidence certs={r.certs} />}
                </>
              )}
            </li>
          );
        })}

        {pendingSignins.map((item) => {
          const s = availById.get(String(item.payload.staff_id));
          const signedOut = Boolean(item.payload.check_out);
          const blocked = s?.blocked;
          const itemRpe = item.payload.rpe ? String(item.payload.rpe) : null;
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {s?.name ?? "Staff"}{" "}
                  <span className="text-xs font-normal text-ink-faint">{s?.roleShort}</span>
                </p>
                {blocked ? (
                  <p className="text-sm font-semibold text-danger-600">BLOCKED · {s?.blockReason}</p>
                ) : (
                  <p className="text-sm text-ink-muted">
                    {signedOut ? "Signed in & out" : "On site"} · pending sync
                    {itemRpe && ` · ${itemRpe}`}
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

      {/* Sign-in: pick a worker (search), review certs, complete checks. */}
      {selected ? (
        <div className="rounded-lg border border-surface-border p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-semibold text-ink">
              {selected.name}{" "}
              <span className="text-xs font-normal text-ink-faint">{selected.roleShort}</span>
            </p>
            <button type="button" onClick={closeSignIn} className="text-sm text-ink-muted">
              Cancel
            </button>
          </div>

          <CertEvidence certs={selected.certs} />

          {selected.blocked ? (
            <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-700">
              Cannot sign in — {selected.blockReason}. Renew before going on site.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <p className="label">Pre-sign-in checks (all required)</p>
                <div className="space-y-1">
                  {checklist.map((item, i) => (
                    <label
                      key={item.label}
                      className="flex min-h-tap cursor-pointer items-start gap-3 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) =>
                          setChecklist((prev) =>
                            prev.map((c, j) => (j === i ? { ...c, checked: e.target.checked } : c))
                          )
                        }
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border-surface-border text-navy-600 focus:ring-navy-500"
                      />
                      <span className="text-sm text-ink">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="rpe" className="label">
                  RPE worn <span className="text-danger-500">*</span>
                </label>
                <select
                  id="rpe"
                  className="field"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                >
                  <option value="">Select RPE…</option>
                  {RPE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={doSignIn}
                disabled={!ready || pending}
                className="btn-primary w-full disabled:opacity-50"
                title={ready ? "" : "Complete all checks and record RPE first"}
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      ) : (
        selectable.length > 0 && (
          <div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff to sign in…"
              className="field"
            />
            {(search.trim() !== "" || selectable.length <= 8) && (
              <ul className="mt-2 space-y-1">
                {filtered.length === 0 && (
                  <li className="px-1 py-2 text-sm text-ink-muted">No matching staff.</li>
                )}
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => openSignIn(s.id)}
                      className="flex min-h-tap w-full items-center justify-between gap-2 rounded-lg border border-surface-border px-3 py-2 text-left active:bg-surface-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{s.name}</span>
                        <span className="text-xs text-ink-faint">{s.roleShort}</span>
                      </span>
                      <WorstCertPill certs={s.certs} blocked={s.blocked} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}

      {error && !selected && (
        <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

function CertEvidence({ certs }: { certs: CertEvidenceItem[] }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {certs.map((c) => (
        <div key={c.label} className="rounded-md border border-surface-border px-2 py-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-ink">{c.label}</span>
            <CertPill level={c.level} />
          </div>
          <span className="text-[11px] text-ink-muted">{c.date ?? "Not recorded"}</span>
        </div>
      ))}
    </div>
  );
}

const LEVEL_PILL: Record<string, [string, string]> = {
  valid: ["pill-ok", "In date"],
  expiring: ["pill-warn", "Expiring"],
  expired: ["pill-danger", "Expired"],
  missing: ["pill-neutral", "Missing"],
};

function CertPill({ level }: { level: string }) {
  const [cls, label] = LEVEL_PILL[level] ?? LEVEL_PILL.missing;
  return <span className={`pill ${cls}`} style={{ fontSize: 10 }}>{label}</span>;
}

function WorstCertPill({ certs, blocked }: { certs: CertEvidenceItem[]; blocked: boolean }) {
  const level = blocked
    ? "expired"
    : certs.some((c) => c.level === "expired")
      ? "expired"
      : certs.some((c) => c.level === "missing")
        ? "missing"
        : certs.some((c) => c.level === "expiring")
          ? "expiring"
          : "valid";
  return <CertPill level={level} />;
}
