"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExposure } from "@/app/(app)/projects/capture-actions";
import {
  durationHours,
  fourHourTWA,
  CONTROL_LIMIT_FML,
} from "@/lib/compliance";
import { ASBESTOS_TYPE_LABEL } from "@/lib/roles";
import { EXPOSURE_TASK_OPTIONS, RPE_OPTIONS } from "@/lib/exposureOptions";
import { formatDate } from "@/lib/format";
import type { AsbestosType } from "@/lib/types";

export interface ExposureRow {
  id: string;
  staffId: string;
  name: string;
  entryDate: string;
  task: string | null;
  asbestos: AsbestosType | null;
  mask: string | null;
  hours: number;
  fibre: number;
  twa: number;
}

export interface Operative {
  id: string;
  name: string;
}

const ASBESTOS: AsbestosType[] = ["chrysotile", "amosite", "crocidolite"];

function twaTone(twa: number) {
  if (twa >= CONTROL_LIMIT_FML) return "text-danger-600";
  if (twa >= CONTROL_LIMIT_FML * 0.5) return "text-warn-700";
  return "text-ok-700";
}

export function ExposureCapture({
  projectId,
  operatives,
  records,
}: {
  projectId: string;
  operatives: Operative[];
  records: ExposureRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Menu-driven fields (picking beats typing on site).
  const [staffId, setStaffId] = useState("");
  const [task, setTask] = useState("");
  const [asbestos, setAsbestos] = useState("");
  const [mask, setMask] = useState("");

  // Live TWA inputs
  const [s1s, setS1s] = useState("");
  const [s1e, setS1e] = useState("");
  const [s2s, setS2s] = useState("");
  const [s2e, setS2e] = useState("");
  const [fibre, setFibre] = useState("");

  const liveHours = durationHours(s1s, s1e) + durationHours(s2s, s2e);
  const liveTwa = useMemo(() => {
    const f = Number(fibre);
    if (!Number.isFinite(f) || liveHours <= 0) return 0;
    return fourHourTWA([{ fibreLevel: f, hours: liveHours }]);
  }, [fibre, liveHours]);

  // Group records by operative-day for the combined 4-hour TWA.
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; entryDate: string; rows: ExposureRow[] }
    >();
    for (const r of records) {
      const key = `${r.staffId}|${r.entryDate}`;
      if (!map.has(key))
        map.set(key, { name: r.name, entryDate: r.entryDate, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.values()].map((g) => ({
      ...g,
      twa: fourHourTWA(g.rows.map((r) => ({ fibreLevel: r.fibre, hours: r.hours }))),
    }));
  }, [records]);

  const lastRecord = records.length ? records[records.length - 1] : null;

  const resetFields = () => {
    setStaffId(""); setTask(""); setAsbestos(""); setMask("");
    setS1s(""); setS1e(""); setS2s(""); setS2e(""); setFibre("");
    setError(null);
  };

  // Fresh entry: default the "sticky" fields (asbestos type + mask rarely change
  // through a shift) from the last record so they're pre-filled but editable.
  const openFresh = () => {
    resetFields();
    if (lastRecord) {
      setAsbestos(lastRecord.asbestos ?? "");
      setMask(lastRecord.mask ?? "");
    }
    setOpen(true);
  };

  // Duplicate last: copy operative + task + asbestos + mask so a repeat entry is
  // just times + fibre + Save. Only the reading and times need re-keying.
  const duplicateLast = () => {
    if (!lastRecord) return;
    resetFields();
    setStaffId(lastRecord.staffId);
    setTask(lastRecord.task ?? "");
    setAsbestos(lastRecord.asbestos ?? "");
    setMask(lastRecord.mask ?? "");
    setOpen(true);
  };

  const onSubmit = (formData: FormData) => {
    formData.set("hours_exposure", String(liveHours));
    setError(null);
    startTransition(async () => {
      const res = await addExposure(projectId, formData);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        resetFields();
        router.refresh();
      }
    });
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Exposure Log
        </h2>
        <span className="text-xs text-ink-faint">
          Control limit {CONTROL_LIMIT_FML} f/ml
        </span>
      </div>

      {/* Grouped per-operative-day TWA */}
      <div className="mb-4 space-y-2">
        {grouped.length === 0 && (
          <p className="text-sm text-ink-muted">No exposure recorded yet.</p>
        )}
        {grouped.map((g, i) => (
          <div key={i} className="rounded-lg border border-surface-border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{g.name}</span>
              <span className={`text-sm font-semibold ${twaTone(g.twa)}`}>
                {g.twa.toFixed(3)} f/ml · 4h TWA
              </span>
            </div>
            <p className="text-xs text-ink-faint">{formatDate(g.entryDate)}</p>
            <ul className="mt-2 space-y-1">
              {g.rows.map((r) => (
                <li key={r.id} className="text-sm text-ink-muted">
                  {r.task ?? "—"}
                  {r.asbestos && ` · ${ASBESTOS_TYPE_LABEL[r.asbestos].split(" ")[0]}`}
                  {` · ${r.hours}h · ${r.fibre} f/ml`}
                  {r.mask && ` · ${r.mask}`}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {!open ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openFresh}
            className="btn-secondary flex-1"
          >
            + Add exposure record
          </button>
          {lastRecord && (
            <button
              type="button"
              onClick={duplicateLast}
              className="btn-secondary flex-1"
              title="Copy the last entry's operative, task, asbestos and mask"
            >
              ⧉ Duplicate last
            </button>
          )}
        </div>
      ) : (
        <form action={onSubmit} className="space-y-3 border-t border-surface-border pt-4">
          <div>
            <label htmlFor="staff_id" className="label">Operative <span className="text-danger-500">*</span></label>
            <select
              id="staff_id" name="staff_id" className="field" required
              value={staffId} onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="" disabled>Select…</option>
              {operatives.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <PickOrType
            name="task"
            label="Task"
            options={EXPOSURE_TASK_OPTIONS as unknown as string[]}
            value={task}
            onChange={setTask}
            placeholder="Describe the task"
          />

          <div>
            <label htmlFor="asbestos_type" className="label">Asbestos type</label>
            <select
              id="asbestos_type" name="asbestos_type" className="field"
              value={asbestos} onChange={(e) => setAsbestos(e.target.value)}
            >
              <option value="">—</option>
              {ASBESTOS.map((a) => (
                <option key={a} value={a}>{ASBESTOS_TYPE_LABEL[a]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TimeField label="Shift 1 start" name="shift1_start" value={s1s} onChange={setS1s} />
            <TimeField label="Shift 1 end" name="shift1_end" value={s1e} onChange={setS1e} />
            <TimeField label="Shift 2 start" name="shift2_start" value={s2s} onChange={setS2s} />
            <TimeField label="Shift 2 end" name="shift2_end" value={s2e} onChange={setS2e} />
          </div>

          <div>
            <label htmlFor="fibre_level" className="label">Fibre level (f/ml) <span className="text-danger-500">*</span></label>
            <input
              id="fibre_level" name="fibre_level" type="number" step="0.001" min="0"
              inputMode="decimal"
              value={fibre} onChange={(e) => setFibre(e.target.value)}
              className="field" required
            />
          </div>

          <PickOrType
            name="mask_worn"
            label="Mask worn"
            options={RPE_OPTIONS as unknown as string[]}
            value={mask}
            onChange={setMask}
            placeholder="RPE model"
          />

          {/* Live 4-hour TWA */}
          <div className="rounded-lg bg-surface-muted p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">
                {liveHours > 0 ? `${liveHours.toFixed(1)}h exposure` : "Enter shift times"}
              </span>
              <span className={`font-semibold ${twaTone(liveTwa)}`}>
                4h TWA: {liveTwa.toFixed(3)} f/ml
              </span>
            </div>
            {liveTwa >= CONTROL_LIMIT_FML && (
              <p className="mt-1 text-xs font-semibold text-danger-600">
                Exceeds the {CONTROL_LIMIT_FML} f/ml control limit.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); resetFields(); }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/**
 * A big menu of common values with an "Other…" escape hatch to a text box.
 * Submits the resolved value under `name` via a hidden input, so the server
 * action is unchanged.
 */
function PickOrType({
  name, label, options, value, onChange, placeholder,
}: {
  name: string;
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isPreset = options.includes(value);
  const [other, setOther] = useState(!isPreset && value !== "");
  const selectValue = other ? "__other__" : isPreset ? value : "";

  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <select
        id={name}
        className="field"
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === "__other__") {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value="__other__">Other…</option>
      </select>
      {other && (
        <input
          className="field mt-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function TimeField({
  label, name, value, onChange,
}: {
  label: string; name: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input
        id={name} name={name} type="time" value={value}
        onChange={(e) => onChange(e.target.value)} className="field"
      />
    </div>
  );
}
