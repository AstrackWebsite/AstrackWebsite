"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logPlantCheck } from "@/app/(app)/projects/capture-actions";
import { PLANT_TYPE_LABEL } from "@/lib/roles";
import { formatDate, todayISO } from "@/lib/format";
import { enqueue } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";
import type { PlantType } from "@/lib/types";

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export interface PlantRow {
  id: string;
  assetId: string;
  name: string | null;
  type: PlantType;
  certExpiry: string | null;
  certExpired: boolean;
  certExpiring: boolean;
  gated: boolean;
  checkedToday: boolean;
}

export interface PlantGate {
  licensed: boolean;
  requiredCount: number;
  startComplete: boolean;
  todayComplete: boolean;
}

export function PlantChecks({
  projectId,
  plant,
  gate,
}: {
  projectId: string;
  plant: PlantRow[];
  gate: PlantGate;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  // Plant checks queued while offline show as checked immediately.
  const queued = useOutbox(projectId, ["plant_check"]);
  const pendingIds = new Set(queued.map((i) => String(i.payload.plant_id)));

  const queueCheck = (plantId: string) =>
    enqueue("plant_check", projectId, { plant_id: plantId, check_date: todayISO() });

  const onCheck = (plantId: string) => {
    if (isOffline()) {
      queueCheck(plantId);
      return;
    }
    setBusy(plantId);
    startTransition(async () => {
      try {
        await logPlantCheck(projectId, plantId);
        router.refresh();
      } catch {
        queueCheck(plantId);
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <div>
      {/* Licensed-project gate (Rule 5) */}
      {gate.licensed && gate.requiredCount > 0 && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${
            !gate.startComplete
              ? "bg-danger-50 text-danger-700"
              : !gate.todayComplete
                ? "bg-warn-50 text-warn-700"
                : "bg-ok-50 text-ok-700"
          }`}
        >
          {!gate.startComplete
            ? "Start-of-project checks required (DCU / vacuum / NPU) before day 1 can proceed."
            : !gate.todayComplete
              ? "Log today's checks for all gated plant to advance the day."
              : "All required plant checks complete for today."}
        </div>
      )}

      <ul className="space-y-2">
        {plant.length === 0 && (
          <li className="text-sm text-ink-muted">No plant assigned to this project.</li>
        )}
        {plant.map((p) => (
          <li
            key={p.id}
            className={`rounded-lg border p-3 ${
              p.certExpired ? "border-danger-200 bg-danger-50" : "border-surface-border"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {p.assetId}
                  {p.gated && <span className="ml-1 pill pill-neutral">Gated</span>}
                </p>
                <p className="text-xs text-ink-muted">
                  {p.name ?? PLANT_TYPE_LABEL[p.type]}
                </p>
              </div>
              {p.checkedToday ? (
                <span className="pill pill-ok shrink-0">Checked ✓</span>
              ) : pendingIds.has(p.id) ? (
                <span className="pill pill-warn shrink-0" title="Saved on device — will sync">
                  Checked · pending
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onCheck(p.id)}
                  disabled={pending && busy === p.id}
                  className="btn-secondary shrink-0 px-3 py-2 text-sm"
                >
                  {busy === p.id ? "…" : "Log check"}
                </button>
              )}
            </div>
            <p
              className={`mt-1 text-xs ${
                p.certExpired
                  ? "font-semibold text-danger-600"
                  : p.certExpiring
                    ? "text-warn-700"
                    : "text-ink-faint"
              }`}
            >
              Cert {p.certExpired ? "expired" : p.certExpiring ? "expiring" : "valid"}
              {p.certExpiry && ` · ${formatDate(p.certExpiry)}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
