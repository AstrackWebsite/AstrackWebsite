"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVisitor, signOutVisitor } from "@/app/(app)/projects/site-log-actions";
import { formatTime, todayISO as getToday } from "@/lib/format";
import { enqueue, updateItem } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export interface VisitorRow {
  id: string;
  name: string;
  organisation: string | null;
  purpose: string | null;
  timeIn: string | null;
  timeOut: string | null;
}

export function VisitorLog({
  projectId,
  visitors,
}: {
  projectId: string;
  visitors: VisitorRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queued = useOutbox(projectId, ["visitor_in", "visitor_out"]);
  const pendingIn = queued.filter((i) => i.kind === "visitor_in");
  const pendingOutIds = new Set(
    queued.filter((i) => i.kind === "visitor_out").map((i) => String(i.payload.visitor_id))
  );

  const queueVisitor = (fd: FormData) => {
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      setError("Enter the visitor's name.");
      return false;
    }
    enqueue("visitor_in", projectId, {
      visit_date: getToday(),
      name,
      organisation: String(fd.get("organisation") ?? "") || null,
      purpose: String(fd.get("purpose") ?? "") || null,
      time_in: new Date().toISOString(),
    });
    return true;
  };

  const onSubmit = (formData: FormData) => {
    setError(null);
    if (isOffline()) {
      if (queueVisitor(formData)) setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        const res = await addVisitor(projectId, formData);
        if (res?.error) setError(res.error);
        else {
          setOpen(false);
          router.refresh();
        }
      } catch {
        if (queueVisitor(formData)) setOpen(false);
      }
    });
  };

  const onSignOut = (visitorId: string) => {
    setError(null);
    if (isOffline()) {
      enqueue("visitor_out", projectId, { visitor_id: visitorId, time_out: new Date().toISOString() });
      return;
    }
    startTransition(async () => {
      try {
        const res = await signOutVisitor(visitorId, projectId);
        if (res?.error) setError(res.error);
        else router.refresh();
      } catch {
        enqueue("visitor_out", projectId, { visitor_id: visitorId, time_out: new Date().toISOString() });
      }
    });
  };

  // Sign out a visitor who was only signed in offline (still in the outbox).
  const onSignOutPending = (itemId: string) =>
    updateItem(itemId, { time_out: new Date().toISOString() });

  return (
    <div>
      {!open && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            + Sign in
          </button>
        </div>
      )}

      {open && (
        <form action={onSubmit} className="mb-4 space-y-3 border-b border-surface-border pb-4">
          <div>
            <label htmlFor="name" className="label">
              Visitor name <span className="text-danger-500">*</span>
            </label>
            <input id="name" name="name" className="field" required placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="organisation" className="label">Organisation</label>
              <input id="organisation" name="organisation" className="field" placeholder="e.g. HSE, client" />
            </div>
            <div>
              <label htmlFor="purpose" className="label">Purpose</label>
              <input id="purpose" name="purpose" className="field" placeholder="e.g. Inspection" />
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Saving…" : "Sign in visitor"}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {visitors.length === 0 && pendingIn.length === 0 && (
          <li className="text-sm text-ink-muted">No visitors logged.</li>
        )}
        {visitors.map((v) => {
          const outPending = pendingOutIds.has(v.id);
          return (
            <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{v.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {v.organisation ?? "—"}
                  {v.purpose && ` · ${v.purpose}`}
                </p>
                <p className="text-xs text-ink-faint">
                  In {formatTime(v.timeIn)}
                  {v.timeOut && ` · Out ${formatTime(v.timeOut)}`}
                  {outPending && !v.timeOut && " · signing out (pending)"}
                </p>
              </div>
              {v.timeOut || outPending ? (
                <span className="pill pill-neutral shrink-0">Signed out</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSignOut(v.id)}
                  disabled={pending}
                  className="btn-secondary shrink-0 px-3 py-2 text-sm"
                >
                  Sign out
                </button>
              )}
            </li>
          );
        })}
        {pendingIn.map((item) => {
          const signedOut = Boolean(item.payload.time_out);
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-warn-500/30 bg-warn-50 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{String(item.payload.name)}</p>
                <p className="truncate text-xs text-ink-muted">
                  {item.payload.organisation ? String(item.payload.organisation) : "—"}
                  {item.payload.purpose && ` · ${String(item.payload.purpose)}`}
                </p>
                <p className="text-xs text-ink-faint">
                  {signedOut ? "Signed in & out" : "On site"} · pending sync
                </p>
              </div>
              {signedOut ? (
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
    </div>
  );
}
