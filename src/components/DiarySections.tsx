"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  addRpeInspection,
  addHavExposure,
  addAnemometerReading,
  addDcuInspection,
  addToolboxTalk,
} from "@/app/(app)/projects/diary-actions";
import { DCU_CHECKS } from "@/lib/diary";
import { formatDate } from "@/lib/format";
import type {
  RpeInspection,
  HavExposure,
  AnemometerReading,
  DcuInspection,
  ToolboxTalk,
} from "@/lib/types";

/** Shared add/list scaffold: a "+ Add" toggle, a form, and error handling. */
function LogPanel({
  projectId,
  action,
  addLabel,
  children,
  list,
}: {
  projectId: string;
  action: (projectId: string, fd: FormData) => Promise<{ error?: string; ok?: boolean }>;
  addLabel: string;
  children: ReactNode;
  list: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (fd: FormData) => {
    setError(null);
    start(async () => {
      const res = await action(projectId, fd);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div>
      {!open && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            {addLabel}
          </button>
        </div>
      )}
      {open && (
        <form action={onSubmit} className="mb-4 space-y-3 border-b border-surface-border pb-4">
          {children}
          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
      {list}
    </div>
  );
}

const L = ({ children }: { children: ReactNode }) => (
  <li className="rounded-lg border border-surface-border p-3 text-sm">{children}</li>
);
const Empty = ({ text }: { text: string }) => <li className="text-sm text-ink-muted">{text}</li>;

function DateField({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type="date" className="field" />
    </div>
  );
}
function TextField({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="field" placeholder={placeholder} />
    </div>
  );
}

// ── Weekly RPE inspections ───────────────────────────────────────────────────
export function RpeInspections({ projectId, rows }: { projectId: string; rows: RpeInspection[] }) {
  return (
    <LogPanel
      projectId={projectId}
      action={addRpeInspection}
      addLabel="+ RPE inspection"
      list={
        <ul className="space-y-2">
          {rows.length === 0 && <Empty text="No RPE inspections yet." />}
          {rows.map((r) => (
            <L key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{r.employee_name ?? "—"}</span>
                <span className={`pill ${r.passed ? "pill-ok" : "pill-danger"}`}>{r.passed ? "Pass" : "Fail"}</span>
              </div>
              <p className="text-xs text-ink-muted">
                {formatDate(r.inspection_date)}
                {r.mask_ref ? ` · ${r.mask_ref}` : ""}
                {r.make_model ? ` · ${r.make_model}` : ""}
              </p>
              {r.comments && <p className="mt-1 text-ink-muted">{r.comments}</p>}
            </L>
          ))}
        </ul>
      }
    >
      <DateField name="inspection_date" label="Date" />
      <TextField name="employee_name" label="Employee" />
      <div className="grid grid-cols-2 gap-2">
        <TextField name="mask_ref" label="Mask ref" />
        <TextField name="make_model" label="Make & model" placeholder="e.g. Scott Vision PA" />
      </div>
      <div>
        <label htmlFor="rpe_passed" className="label">Outcome</label>
        <select id="rpe_passed" name="passed" className="field" defaultValue="true">
          <option value="true">Pass — serviceable</option>
          <option value="false">Fail — remove from use</option>
        </select>
      </div>
      <TextField name="inspector_name" label="Inspected by (competent person)" />
      <div>
        <label htmlFor="rpe_comments" className="label">Comments / faults</label>
        <textarea id="rpe_comments" name="comments" rows={2} className="field" />
      </div>
    </LogPanel>
  );
}

// ── HAV exposure ─────────────────────────────────────────────────────────────
export function HavExposureLog({ projectId, rows }: { projectId: string; rows: HavExposure[] }) {
  return (
    <LogPanel
      projectId={projectId}
      action={addHavExposure}
      addLabel="+ HAV entry"
      list={
        <ul className="space-y-2">
          {rows.length === 0 && <Empty text="No HAV records yet." />}
          {rows.map((r) => (
            <L key={r.id}>
              <p className="font-medium text-ink">{r.tool ?? "—"}</p>
              <p className="text-xs text-ink-muted">
                {formatDate(r.entry_date)}
                {r.start_time ? ` · ${r.start_time}–${r.finish_time ?? ""}` : ""}
                {r.vibration_magnitude != null ? ` · ${r.vibration_magnitude} m/s²` : ""}
              </p>
              <p className="text-xs text-ink-muted">
                {r.operative1 ? `${r.operative1}${r.duration1 ? ` (${r.duration1})` : ""}` : ""}
                {r.operative2 ? ` · ${r.operative2}${r.duration2 ? ` (${r.duration2})` : ""}` : ""}
              </p>
              {(r.eav || r.elv) && (
                <p className="text-xs text-ink-muted">EAV {r.eav ?? "—"} · ELV {r.elv ?? "—"}</p>
              )}
            </L>
          ))}
        </ul>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <DateField name="entry_date" label="Date" />
        <TextField name="tool" label="Tool" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField name="start_time" label="Start time" placeholder="08:00" />
        <TextField name="finish_time" label="Finish time" placeholder="10:30" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField name="operative1" label="Operative 1" />
        <TextField name="duration1" label="Duration" placeholder="h:mm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField name="operative2" label="Operative 2" />
        <TextField name="duration2" label="Duration" placeholder="h:mm" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <TextField name="vibration_magnitude" label="Vibration m/s²" />
        <TextField name="eav" label="EAV" />
        <TextField name="elv" label="ELV" />
      </div>
    </LogPanel>
  );
}

// ── Anemometer readings ──────────────────────────────────────────────────────
export function AnemometerLog({ projectId, rows }: { projectId: string; rows: AnemometerReading[] }) {
  return (
    <LogPanel
      projectId={projectId}
      action={addAnemometerReading}
      addLabel="+ Anemometer reading"
      list={
        <ul className="space-y-2">
          {rows.length === 0 && <Empty text="No readings yet." />}
          {rows.map((r) => (
            <L key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{r.npu_id ?? "NPU"}</span>
                <span className="text-xs text-ink-muted">{formatDate(r.reading_date)}</span>
              </div>
              <p className="text-xs text-ink-muted">
                Avg {r.average_velocity ?? "—"} m/s
                {r.volume_m3 != null ? ` · ${r.volume_m3} m³/hr` : ""}
                {r.npu_capacity != null ? ` · capacity ${r.npu_capacity} m³` : ""}
              </p>
              {r.points && <p className="text-xs text-ink-muted">Points: {r.points.join(", ")} m/s</p>}
            </L>
          ))}
        </ul>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <DateField name="reading_date" label="Date" />
        <TextField name="npu_id" label="NPU ID" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField name="npu_capacity" label="NPU capacity (m³/hr)" />
        <TextField name="filter_face_m2" label="Filter face m² (L×W)" />
      </div>
      <label className="label">Air velocities across the filter face (m/s) — 5 points</label>
      <div className="grid grid-cols-5 gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <input key={i} name={`point_${i}`} inputMode="decimal" className="field" placeholder={`${i + 1}`} />
        ))}
      </div>
      <p className="text-xs text-ink-faint">Average velocity and total volume are calculated on save.</p>
    </LogPanel>
  );
}

// ── DCU daily inspection ─────────────────────────────────────────────────────
export function DcuInspections({ projectId, rows }: { projectId: string; rows: DcuInspection[] }) {
  return (
    <LogPanel
      projectId={projectId}
      action={addDcuInspection}
      addLabel="+ DCU inspection"
      list={
        <ul className="space-y-2">
          {rows.length === 0 && <Empty text="No DCU inspections yet." />}
          {rows.map((r) => {
            const done = r.checks?.filter((c) => c.checked).length ?? 0;
            const total = r.checks?.length ?? 0;
            return (
              <L key={r.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink">{r.dcu_id ?? "DCU"}</span>
                  <span className="text-xs text-ink-muted">{formatDate(r.inspection_date)}</span>
                </div>
                <p className="text-xs text-ink-muted">{done}/{total} checks confirmed</p>
                {r.comments && <p className="mt-1 text-ink-muted">{r.comments}</p>}
              </L>
            );
          })}
        </ul>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <DateField name="inspection_date" label="Date" />
        <TextField name="dcu_id" label="DCU ID" />
      </div>
      <fieldset className="rounded-lg border border-surface-border p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Daily checks</legend>
        <div className="space-y-1">
          {DCU_CHECKS.map((label, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" name={`check_${i}`} className="mt-1 h-4 w-4" />
              <span className="text-ink">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="dcu_comments" className="label">Comments / faults</label>
        <textarea id="dcu_comments" name="comments" rows={2} className="field" />
      </div>
    </LogPanel>
  );
}

// ── Toolbox talks ────────────────────────────────────────────────────────────
export function ToolboxTalks({ projectId, rows }: { projectId: string; rows: ToolboxTalk[] }) {
  return (
    <LogPanel
      projectId={projectId}
      action={addToolboxTalk}
      addLabel="+ Toolbox talk"
      list={
        <ul className="space-y-2">
          {rows.length === 0 && <Empty text="No toolbox talks yet." />}
          {rows.map((r) => (
            <L key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{r.topic ?? "—"}</span>
                <span className="text-xs text-ink-muted">{formatDate(r.talk_date)}</span>
              </div>
              <p className="text-xs text-ink-muted">
                {r.delivered_by ? `By ${r.delivered_by}` : ""}
                {r.attendees ? ` · ${r.attendees}` : ""}
              </p>
              {r.notes && <p className="mt-1 text-ink-muted">{r.notes}</p>}
            </L>
          ))}
        </ul>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <DateField name="talk_date" label="Date" />
        <TextField name="topic" label="Topic" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextField name="delivered_by" label="Delivered by" />
        <TextField name="attendees" label="Attendees" />
      </div>
      <div>
        <label htmlFor="tbt_notes" className="label">Notes</label>
        <textarea id="tbt_notes" name="notes" rows={2} className="field" />
      </div>
    </LogPanel>
  );
}
