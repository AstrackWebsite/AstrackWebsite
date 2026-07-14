"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWorkArea } from "@/app/(app)/projects/work-area-actions";
import {
  ENCLOSURE_REQUIREMENTS,
  activeRequirements,
  type SpecialRequirements,
} from "@/lib/enclosures";

export interface WorkAreaRow {
  id: string;
  name: string;
  location: string | null;
  taskActivity: string | null;
  specialRequirements: SpecialRequirements | null;
  notes: string | null;
  planUrl: string | null;
  hasPlan: boolean;
}

export function WorkAreas({
  projectId,
  areas,
}: {
  projectId: string;
  areas: WorkAreaRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [reqs, setReqs] = useState<Record<string, boolean>>({});

  const reset = () => {
    setOpen(false);
    setError(null);
    setFileName("");
    setReqs({});
  };

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await addWorkArea(projectId, formData);
      if (res?.error) setError(res.error);
      else {
        reset();
        router.refresh();
      }
    });
  };

  return (
    <div>
      {!open && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            + Add enclosure
          </button>
        </div>
      )}

      {open && (
        <form action={onSubmit} className="mb-4 space-y-3 border-b border-surface-border pb-4">
          <div>
            <label htmlFor="name" className="label">
              Enclosure ID <span className="text-danger-500">*</span>
            </label>
            <input id="name" name="name" className="field" required placeholder="e.g. E1 / Ground floor enclosure" />
          </div>
          <div>
            <label htmlFor="location" className="label">Location</label>
            <input id="location" name="location" className="field" placeholder="e.g. Boiler room, level 1" />
          </div>
          <div>
            <label htmlFor="task_activity" className="label">Task / activity</label>
            <input id="task_activity" name="task_activity" className="field" placeholder="e.g. Remove AIB ceiling tiles" />
          </div>

          <fieldset className="rounded-lg border border-surface-border p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Special requirements
            </legend>
            <div className="space-y-2">
              {ENCLOSURE_REQUIREMENTS.map((r) => (
                <div key={r.key}>
                  <label className="flex min-h-tap cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name={`req_${r.key}`}
                      checked={Boolean(reqs[r.key])}
                      onChange={(e) =>
                        setReqs((prev) => ({ ...prev, [r.key]: e.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-ink">{r.label}</span>
                  </label>
                  {reqs[r.key] && (
                    <input
                      name={`detail_${r.key}`}
                      className="field mt-1"
                      placeholder={r.detailLabel}
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea id="notes" name="notes" rows={2} className="field" placeholder="Access, hazards…" />
          </div>
          <div>
            <label className="label">Plan / drawing (optional)</label>
            <label className="btn-secondary w-full cursor-pointer text-center">
              {fileName || "Choose PDF or image"}
              <input
                type="file"
                name="plan"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            <p className="mt-1 text-xs text-ink-faint">PDF, JPG, PNG or WebP · up to 15MB.</p>
          </div>
          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Saving…" : "Save enclosure"}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {areas.length === 0 && (
          <li className="text-sm text-ink-muted">No enclosures yet.</li>
        )}
        {areas.map((a) => {
          const active = activeRequirements(a.specialRequirements);
          return (
            <li key={a.id} className="rounded-lg border border-surface-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{a.name}</p>
                  {a.location && <p className="truncate text-xs text-ink-muted">{a.location}</p>}
                  {a.taskActivity && (
                    <p className="mt-1 text-sm text-ink">{a.taskActivity}</p>
                  )}
                  {active.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {active.map((r) => (
                        <li
                          key={r.key}
                          className="pill pill-warn"
                          title={r.detail || undefined}
                        >
                          {r.label}
                          {r.detail ? `: ${r.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {a.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-muted">{a.notes}</p>}
                </div>
                {a.hasPlan &&
                  (a.planUrl ? (
                    <a
                      href={a.planUrl}
                      target="_blank"
                      rel="noopener"
                      className="btn-secondary shrink-0 px-3 py-2 text-sm"
                    >
                      View plan
                    </a>
                  ) : (
                    <span className="pill pill-neutral shrink-0">Plan on file</span>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
