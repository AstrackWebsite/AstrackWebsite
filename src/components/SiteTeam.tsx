"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignStaff, unassignStaff } from "@/app/(app)/projects/team-actions";

export interface TeamMember {
  id: string;
  name: string;
  roleShort: string;
}

/**
 * Office-only: manage which staff are on a project's team. The site register
 * only lets the supervisor sign in people from this list.
 */
export function SiteTeam({
  projectId,
  team,
  addable,
}: {
  projectId: string;
  team: TeamMember[];
  addable: TeamMember[];
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
    <section className="card p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Site Team
      </h2>
      <p className="mb-3 text-xs text-ink-faint">
        Office picks who&apos;s on this job — the supervisor can only sign these
        people in.
      </p>

      <ul className="mb-3 divide-y divide-surface-border">
        {team.length === 0 && (
          <li className="py-2 text-sm text-ink-muted">No one assigned yet.</li>
        )}
        {team.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="truncate font-medium text-ink">{m.name}</span>{" "}
              <span className="text-xs text-ink-faint">{m.roleShort}</span>
            </span>
            <button
              type="button"
              onClick={() => run(() => unassignStaff(projectId, m.id))}
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
            aria-label="Add staff to the team"
          >
            <option value="">+ Add to team…</option>
            {addable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.roleShort}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => selected && run(() => assignStaff(projectId, selected))}
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
    </section>
  );
}
