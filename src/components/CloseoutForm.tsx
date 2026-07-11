"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCloseout, completeProject } from "@/app/(app)/projects/closeout-actions";
import type { ProjectCloseout } from "@/lib/types";

const HANDOVER: { key: keyof ProjectCloseout; label: string }[] = [
  { key: "plan_of_work_delivered", label: "Plan of work delivered" },
  { key: "air_monitoring_complete", label: "Air monitoring complete" },
  { key: "four_stage_clearance_commenced", label: "4-stage clearance commenced" },
  { key: "cert_reoccupation_received", label: "Certificate of reoccupation received" },
];

const SIGNOFF: { key: keyof ProjectCloseout; label: string }[] = [
  { key: "site_clearance_confirmed", label: "Site clearance confirmed — site clean and ready" },
  { key: "documentation_confirmed", label: "All documentation & photos uploaded" },
];

type Flags = Record<string, boolean>;

export function CloseoutForm({
  projectId,
  closeout,
  completed,
}: {
  projectId: string;
  closeout: ProjectCloseout | null;
  completed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [flags, setFlags] = useState<Flags>(() => {
    const f: Flags = {};
    [...HANDOVER, ...SIGNOFF].forEach((i) => {
      f[i.key as string] = Boolean(closeout?.[i.key]);
    });
    return f;
  });
  const [rating, setRating] = useState<number>(closeout?.client_rating ?? 0);
  const [comments, setComments] = useState<string>(closeout?.client_comments ?? "");

  const allHandover = HANDOVER.every((i) => flags[i.key as string]);
  const allSignoff = SIGNOFF.every((i) => flags[i.key as string]);
  const canComplete = allHandover && allSignoff && !completed;

  const buildForm = () => {
    const fd = new FormData();
    Object.entries(flags).forEach(([k, v]) => v && fd.set(k, "true"));
    fd.set("client_rating", String(rating));
    fd.set("client_comments", comments);
    return fd;
  };

  const doSave = () => {
    setError(null); setSaved(false);
    startTransition(async () => {
      const res = await saveCloseout(projectId, buildForm());
      if (res?.error) setError(res.error);
      else { setSaved(true); router.refresh(); }
    });
  };

  const doComplete = () => {
    setError(null);
    startTransition(async () => {
      const res = await completeProject(projectId, buildForm());
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const toggle = (k: string) =>
    setFlags((f) => ({ ...f, [k]: !f[k] }));

  return (
    <div className="space-y-4">
      {completed && (
        <div className="rounded-card border border-ok-500/30 bg-ok-50 p-4">
          <p className="font-semibold text-ok-700">Project completed</p>
          <p className="text-sm text-ok-700">
            The closeout pack is ready to send to the client.
          </p>
          <a
            href={`/projects/${projectId}/closeout/pdf`}
            target="_blank"
            rel="noopener"
            className="btn-primary mt-3 w-full"
          >
            Download closeout pack (PDF)
          </a>
        </div>
      )}

      {/* Analyst handover */}
      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Analyst Handover
        </h2>
        <p className="mb-3 text-xs text-ink-faint">
          Handover cannot proceed until every item is checked.
        </p>
        <div className="space-y-1">
          {HANDOVER.map((i) => (
            <Check
              key={i.key as string}
              label={i.label}
              checked={flags[i.key as string]}
              disabled={completed}
              onChange={() => toggle(i.key as string)}
            />
          ))}
        </div>
      </section>

      {/* Supervisor sign-off */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Supervisor Sign-Off
        </h2>
        <div className="space-y-1">
          {SIGNOFF.map((i) => (
            <Check
              key={i.key as string}
              label={i.label}
              checked={flags[i.key as string]}
              disabled={completed}
              onChange={() => toggle(i.key as string)}
            />
          ))}
        </div>
      </section>

      {/* Client satisfaction */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Client Satisfaction
        </h2>
        <div className="mb-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={completed}
              onClick={() => setRating(n)}
              className={`text-3xl ${n <= rating ? "text-warn-500" : "text-ink-faint"}`}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comments}
          disabled={completed}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Comments…"
          rows={3}
          className="field"
        />
      </section>

      {error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg bg-ok-50 px-3 py-2 text-sm font-medium text-ok-700">
          Progress saved.
        </p>
      )}

      {!completed && (
        <div className="flex gap-2">
          <button type="button" onClick={doSave} disabled={pending} className="btn-secondary flex-1">
            Save progress
          </button>
          <button
            type="button"
            onClick={doComplete}
            disabled={pending || !canComplete}
            className="btn-primary flex-1 disabled:opacity-50"
            title={canComplete ? "" : "Check all handover & sign-off items first"}
          >
            Complete Project
          </button>
        </div>
      )}
    </div>
  );
}

function Check({
  label, checked, onChange, disabled,
}: {
  label: string; checked: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <label className="flex min-h-tap cursor-pointer items-start gap-3 py-1.5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-surface-border text-navy-600 focus:ring-navy-500"
      />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}
