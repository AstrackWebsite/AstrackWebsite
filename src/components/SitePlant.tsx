"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignPlant, unassignPlant } from "@/app/(app)/projects/plant-actions";

export interface PlantOption {
  id: string;
  assetId: string;
  label: string;
  certExpired: boolean;
}

/**
 * Office-only: choose which plant assets are on this job. The supervisor then
 * logs the daily checks against whatever is assigned here.
 */
export function SitePlant({
  projectId,
  assigned,
  addable,
}: {
  projectId: string;
  assigned: PlantOption[];
  addable: PlantOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string; ok?: boolean }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else {
        setSelected("");
        router.refresh();
      }
    });
  };

  return (
    <div className="mb-4 rounded-lg border border-surface-border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Assigned plant (office)
      </p>

      <ul className="mb-3 divide-y divide-surface-border">
        {assigned.length === 0 && (
          <li className="py-2 text-sm text-ink-muted">No plant assigned yet.</li>
        )}
        {assigned.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="truncate font-medium text-ink">{p.assetId}</span>{" "}
              <span className="text-xs text-ink-faint">{p.label}</span>
            </span>
            <button
              type="button"
              onClick={() => run(() => unassignPlant(projectId, p.id))}
              disabled={pending}
              className="shrink-0 text-sm font-medium text-danger-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {addable.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="field flex-1"
            aria-label="Assign plant to this project"
          >
            <option value="">+ Assign plant…</option>
            {addable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.assetId} · {p.label}
                {p.certExpired ? " (cert expired)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => selected && run(() => assignPlant(projectId, selected))}
            disabled={!selected || pending}
            className="btn-primary px-4 py-2 text-sm"
          >
            Add
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
