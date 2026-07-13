"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startShift, endShift } from "@/app/(app)/projects/shift-actions";
import { formatTime } from "@/lib/format";

export interface ShiftState {
  startedAt: string;
  endedAt: string | null;
}

export function ShiftControl({
  projectId,
  shift,
  stillOnSite,
}: {
  projectId: string;
  shift: ShiftState | null;
  stillOnSite: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string; ok?: boolean }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const started = Boolean(shift) && !shift?.endedAt;
  const ended = Boolean(shift?.endedAt);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">
            {ended
              ? `Started ${formatTime(shift!.startedAt)} · ended ${formatTime(shift!.endedAt)}`
              : started
                ? `In progress since ${formatTime(shift!.startedAt)}`
                : "Not started"}
          </p>
        </div>

        {!shift && (
          <button
            type="button"
            onClick={() => run(() => startShift(projectId))}
            disabled={pending}
            className="btn-primary shrink-0 px-4 py-2 text-sm"
          >
            Start shift
          </button>
        )}

        {started && (
          <button
            type="button"
            onClick={() => run(() => endShift(projectId))}
            disabled={pending || stillOnSite > 0}
            className="btn-secondary shrink-0 px-4 py-2 text-sm disabled:opacity-50"
            title={stillOnSite > 0 ? "Sign everyone out first" : "End the day's shift"}
          >
            End shift
          </button>
        )}

        {ended && (
          <button
            type="button"
            onClick={() => run(() => startShift(projectId))}
            disabled={pending}
            className="btn-secondary shrink-0 px-4 py-2 text-sm"
          >
            Reopen
          </button>
        )}
      </div>

      {started && stillOnSite > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          {stillOnSite} still on site — sign everyone out to end the shift.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
