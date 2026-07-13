"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVisitor, signOutVisitor } from "@/app/(app)/projects/site-log-actions";
import { formatTime } from "@/lib/format";

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

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await addVisitor(projectId, formData);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  const onSignOut = (visitorId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await signOutVisitor(visitorId, projectId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Visitors
        </h2>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            + Sign in
          </button>
        )}
      </div>

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
        {visitors.length === 0 && (
          <li className="text-sm text-ink-muted">No visitors logged.</li>
        )}
        {visitors.map((v) => (
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
              </p>
            </div>
            {v.timeOut ? (
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
        ))}
      </ul>
    </section>
  );
}
