"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createAirResult,
  scanAirReportAction,
  type AirScanState,
} from "@/app/(app)/air-monitoring/actions";
import { AIR_MONITORING_TYPE_LABEL } from "@/lib/roles";
import { airPasses, airLimitFor } from "@/lib/compliance";
import type { AirMonitoringType, Project, Staff } from "@/lib/types";

const initialSave: { error?: string } = {};
const initialScan: AirScanState = {};

const AIR_TYPES: AirMonitoringType[] = ["background", "leak", "reassurance", "clearance"];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : "Save air result"}
    </button>
  );
}

function ScanButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary w-full" disabled={pending}>
      {pending ? "Reading certificate…" : "Read result from certificate"}
    </button>
  );
}

export function AddAirResultForm({
  projects,
  staff,
  aiEnabled,
}: {
  projects: Project[];
  staff: Staff[];
  aiEnabled: boolean;
}) {
  const [state, formAction] = useFormState(createAirResult, initialSave);

  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState<AirMonitoringType>("clearance");
  const [resultFml, setResultFml] = useState("");
  const [sampledOn, setSampledOn] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [pass, setPass] = useState<"" | "pass" | "fail">("");

  const numeric = resultFml.trim() === "" ? null : Number(resultFml);
  const suggested = airPasses(type, Number.isNaN(numeric as number) ? null : numeric);
  const limit = airLimitFor(type);

  function applyScan(r: NonNullable<AirScanState & { ok: true }>["result"]) {
    if (r.sampleType !== "unknown") setType(r.sampleType);
    if (r.resultFml != null) setResultFml(String(r.resultFml));
    if (r.sampledOn) setSampledOn(r.sampledOn);
    if (r.statedResult === "pass") setPass("pass");
    else if (r.statedResult === "fail") setPass("fail");
  }

  return (
    <>
      {aiEnabled && <AirScanner onApply={applyScan} />}

      <form action={formAction} className="card space-y-4 p-5">
        <div>
          <label htmlFor="project_id" className="label">
            Project <span className="text-danger-500">*</span>
          </label>
          <select
            id="project_id"
            name="project_id"
            className="field"
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="label">
            Test type <span className="text-danger-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            className="field"
            value={type}
            onChange={(e) => setType(e.target.value as AirMonitoringType)}
          >
            {AIR_TYPES.map((t) => (
              <option key={t} value={t}>
                {AIR_MONITORING_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-muted">
            Pass threshold for {AIR_MONITORING_TYPE_LABEL[type].toLowerCase()}:
            below {limit} f/ml.
          </p>
        </div>

        <div>
          <label htmlFor="result_fml" className="label">
            Result (f/ml)
          </label>
          <input
            id="result_fml"
            name="result_fml"
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            className="field"
            value={resultFml}
            onChange={(e) => setResultFml(e.target.value)}
            placeholder="e.g. 0.01"
          />
          {suggested != null && (
            <p className="mt-1 text-xs text-ink-muted">
              Suggested outcome:{" "}
              <span className={suggested ? "font-semibold text-ok-700" : "font-semibold text-danger-600"}>
                {suggested ? "Pass" : "Fail"}
              </span>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="sampled_on" className="label">
            Date sampled
          </label>
          <input
            id="sampled_on"
            name="sampled_on"
            type="date"
            className="field"
            value={sampledOn}
            onChange={(e) => setSampledOn(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="supervisor_id" className="label">
            Supervisor present
          </label>
          <select
            id="supervisor_id"
            name="supervisor_id"
            className="field"
            value={supervisorId}
            onChange={(e) => setSupervisorId(e.target.value)}
          >
            <option value="">—</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pass" className="label">
            Outcome
          </label>
          <select
            id="pass"
            name="pass"
            className="field"
            value={pass}
            onChange={(e) => setPass(e.target.value as "" | "pass" | "fail")}
          >
            <option value="">Use suggested ({suggested == null ? "pending" : suggested ? "pass" : "fail"})</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
            {state.error}
          </p>
        )}

        <SaveButton />
      </form>
    </>
  );
}

function AirScanner({
  onApply,
}: {
  onApply: (r: NonNullable<AirScanState & { ok: true }>["result"]) => void;
}) {
  const [scan, scanAction] = useFormState(scanAirReportAction, initialScan);
  const [fileName, setFileName] = useState("");
  const appliedRef = useRef<AirScanState | null>(null);

  useEffect(() => {
    if (appliedRef.current === scan) return;
    if ("ok" in scan && scan.ok) {
      appliedRef.current = scan;
      onApply(scan.result);
    }
  }, [scan, onApply]);

  const result = "ok" in scan && scan.ok ? scan.result : null;
  const error = "ok" in scan && !scan.ok ? scan.error : undefined;

  return (
    <form
      action={scanAction}
      className="card mb-4 space-y-3 border-accent-200 bg-accent-50/50 p-5"
    >
      <div className="flex items-start gap-2">
        <SparkIcon />
        <div>
          <h2 className="font-semibold text-ink">Scan the analyst&apos;s certificate</h2>
          <p className="text-sm text-ink-muted">
            Upload the UKAS report — the type, result and date fill in below for
            you to check.
          </p>
        </div>
      </div>

      <label className="btn-secondary w-full cursor-pointer text-center">
        {fileName || "Choose PDF or photo"}
        <input
          type="file"
          name="report"
          accept="image/*,application/pdf"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? "");
            appliedRef.current = null;
          }}
        />
      </label>

      {fileName && <ScanButton />}

      {error && (
        <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm font-medium text-warn-700">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-1 rounded-lg bg-surface px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">
              {result.sampleType !== "unknown"
                ? AIR_MONITORING_TYPE_LABEL[result.sampleType]
                : "Air test"}
              {result.resultFml != null &&
                ` · ${result.resultIsLessThan ? "<" : ""}${result.resultFml} f/ml`}
            </span>
            <ConfidenceBadge level={result.confidence} />
          </div>
          <p className="text-xs text-ink-muted">
            {result.labName ? `${result.labName} · ` : ""}
            {result.sampledOn ?? "date not read"}
            {result.statedResult !== "not_stated" &&
              ` · certificate states ${result.statedResult}`}
          </p>
          <p className="text-xs text-ink-muted">
            Filled in below — please confirm before saving.
          </p>
        </div>
      )}
    </form>
  );
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const cls =
    level === "high" ? "pill-ok" : level === "medium" ? "pill-neutral" : "pill-warn";
  return <span className={`pill shrink-0 ${cls}`}>{level}</span>;
}

function SparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-0.5 h-5 w-5 shrink-0 text-accent-600"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2zM19 13l.9 2.6L22 16l-2.1.4L19 19l-.9-2.6L16 16l2.1-.4L19 13zM5 14l.9 2.6L8 17l-2.1.4L5 20l-.9-2.6L2 17l2.1-.4L5 14z" />
    </svg>
  );
}
