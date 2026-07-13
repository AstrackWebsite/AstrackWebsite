"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWorkArea } from "@/app/(app)/projects/work-area-actions";

export interface WorkAreaRow {
  id: string;
  name: string;
  location: string | null;
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

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await addWorkArea(projectId, formData);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        setFileName("");
        router.refresh();
      }
    });
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Work Areas &amp; Plans
        </h2>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            + Add area
          </button>
        )}
      </div>

      {open && (
        <form action={onSubmit} className="mb-4 space-y-3 border-b border-surface-border pb-4">
          <div>
            <label htmlFor="name" className="label">
              Area / enclosure name <span className="text-danger-500">*</span>
            </label>
            <input id="name" name="name" className="field" required placeholder="e.g. Ground floor enclosure" />
          </div>
          <div>
            <label htmlFor="location" className="label">Location</label>
            <input id="location" name="location" className="field" placeholder="e.g. Boiler room, level 1" />
          </div>
          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea id="notes" name="notes" rows={2} className="field" placeholder="Access, isolations, hazards…" />
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
            <button type="button" onClick={() => { setOpen(false); setError(null); setFileName(""); }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Saving…" : "Save area"}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {areas.length === 0 && (
          <li className="text-sm text-ink-muted">No work areas yet.</li>
        )}
        {areas.map((a) => (
          <li key={a.id} className="rounded-lg border border-surface-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{a.name}</p>
                {a.location && <p className="truncate text-xs text-ink-muted">{a.location}</p>}
                {a.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{a.notes}</p>}
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
        ))}
      </ul>
    </section>
  );
}
