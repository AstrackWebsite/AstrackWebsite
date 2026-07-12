"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createIncident,
  draftIncidentAction,
  type IncidentDraftState,
} from "@/app/(app)/incidents/actions";
import {
  INCIDENT_TYPE_LABEL,
  INCIDENT_SEVERITY_LABEL,
  RIDDOR_SUGGEST_TYPES,
  PLANT_LINKED_INCIDENT_TYPES,
} from "@/lib/roles";
import type { IncidentType, IncidentSeverity, Staff, Project, Plant } from "@/lib/types";

const initialState: { error?: string } = {};
const initialDraft: IncidentDraftState = {};
const TYPES: IncidentType[] = [
  "injury", "near_miss", "fibre_release", "dangerous_occurrence",
  "equipment_failure", "fault", "other",
];
const SEVERITIES: IncidentSeverity[] = ["minor", "moderate", "serious"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : "Submit report"}
    </button>
  );
}

function DraftButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary w-full" disabled={pending}>
      {pending ? "Drafting…" : "Draft with AI"}
    </button>
  );
}

export function IncidentForm({
  staff,
  projects,
  plant,
  aiEnabled,
}: {
  staff: Staff[];
  projects: Project[];
  plant: Plant[];
  aiEnabled: boolean;
}) {
  const [type, setType] = useState<IncidentType>("near_miss");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"" | IncidentSeverity>("");
  const [description, setDescription] = useState("");
  const [riddor, setRiddor] = useState(false);
  const [riddorReason, setRiddorReason] = useState<string | null>(null);
  const [state, formAction] = useFormState(createIncident, initialState);

  const onType = (t: IncidentType) => {
    setType(t);
    setRiddor(RIDDOR_SUGGEST_TYPES.includes(t)); // auto-flag reportable types
    setRiddorReason(null);
  };
  const showPlant = PLANT_LINKED_INCIDENT_TYPES.includes(type);

  return (
    <>
      {aiEnabled && (
        <IncidentAssist
          onDraft={(d) => {
            setType(d.type);
            setTitle(d.title);
            setSeverity(d.severity === "unknown" ? "" : d.severity);
            setDescription(d.description);
            setRiddor(d.riddorReportable);
            setRiddorReason(d.riddorReason);
          }}
        />
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="riddor_reportable" value={riddor ? "on" : "off"} />

        <fieldset className="card space-y-4 p-5">
          <div>
            <label htmlFor="type" className="label">
              Type <span className="text-danger-500">*</span>
            </label>
            <select
              id="type" name="type" className="field" value={type}
              onChange={(e) => onType(e.target.value as IncidentType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{INCIDENT_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="label">
              Short title <span className="text-danger-500">*</span>
            </label>
            <input
              id="title" name="title" className="field"
              placeholder="e.g. Operative cut hand on sheeting" required
              value={title} onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="occurred_at" className="label">
                When <span className="text-danger-500">*</span>
              </label>
              <input id="occurred_at" name="occurred_at" type="datetime-local" className="field" required />
            </div>
            <div>
              <label htmlFor="severity" className="label">Severity</label>
              <select
                id="severity" name="severity" className="field"
                value={severity} onChange={(e) => setSeverity(e.target.value as "" | IncidentSeverity)}
              >
                <option value="">—</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{INCIDENT_SEVERITY_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="location" className="label">Location</label>
            <input id="location" name="location" className="field" placeholder="e.g. Enclosure, ground floor" />
          </div>

          <div>
            <label htmlFor="description" className="label">What happened</label>
            <textarea
              id="description" name="description" rows={4} className="field"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="card space-y-4 p-5">
          <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Links
          </legend>
          <div>
            <label htmlFor="project_id" className="label">Project (optional)</label>
            <select id="project_id" name="project_id" className="field" defaultValue="">
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>

          {showPlant && (
            <div>
              <label htmlFor="plant_id" className="label">Equipment (links the fault to the asset)</label>
              <select id="plant_id" name="plant_id" className="field" defaultValue="">
                <option value="">—</option>
                {plant.map((p) => (
                  <option key={p.id} value={p.id}>{p.asset_id} · {p.name ?? p.type}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="reported_by_staff_id" className="label">Reported by</label>
            <select id="reported_by_staff_id" name="reported_by_staff_id" className="field" defaultValue="">
              <option value="">—</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* RIDDOR */}
        <label className={`card flex items-start gap-3 p-4 ${riddor ? "border-danger-200 bg-danger-50" : ""}`}>
          <input
            type="checkbox"
            checked={riddor}
            onChange={(e) => { setRiddor(e.target.checked); }}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-surface-border text-danger-600 focus:ring-danger-500"
          />
          <span className="text-sm">
            <span className="font-semibold text-ink">RIDDOR reportable</span>
            <span className="block text-ink-muted">
              {riddorReason
                ? riddorReason
                : RIDDOR_SUGGEST_TYPES.includes(type)
                  ? "Auto-flagged for this type — confirm and report to the HSE within the required timeframe."
                  : "Tick if this event must be reported to the HSE under RIDDOR."}
            </span>
            {riddorReason && (
              <span className="mt-1 block text-xs font-medium text-ink-faint">
                AI suggestion — you must confirm reportability.
              </span>
            )}
          </span>
        </label>

        {state?.error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </>
  );
}

function IncidentAssist({
  onDraft,
}: {
  onDraft: (d: NonNullable<IncidentDraftState & { ok: true }>["draft"]) => void;
}) {
  const [draft, draftAction] = useFormState(draftIncidentAction, initialDraft);
  const appliedRef = useRef<IncidentDraftState | null>(null);

  useEffect(() => {
    if (appliedRef.current === draft) return;
    if ("ok" in draft && draft.ok) {
      appliedRef.current = draft;
      onDraft(draft.draft);
    }
  }, [draft, onDraft]);

  const result = "ok" in draft && draft.ok ? draft.draft : null;
  const error = "ok" in draft && !draft.ok ? draft.error : undefined;

  return (
    <form action={draftAction} className="card mb-4 space-y-3 border-accent-200 bg-accent-50/50 p-5">
      <div className="flex items-start gap-2">
        <SparkIcon />
        <div>
          <h2 className="font-semibold text-ink">Describe it — AI drafts the report</h2>
          <p className="text-sm text-ink-muted">
            Type or dictate what happened in your own words. The form below fills
            in for you to check and correct.
          </p>
        </div>
      </div>

      <textarea
        name="account"
        rows={3}
        className="field"
        placeholder="e.g. About 2pm Dave caught his forearm on a cut edge of sheeting in the enclosure, deep cut, first aider dressed it, he carried on…"
      />
      <DraftButton />

      {error && (
        <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm font-medium text-warn-700">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-2 rounded-lg bg-surface px-3 py-2 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Draft applied below
          </p>
          {result.immediateActions.length > 0 && (
            <div>
              <p className="font-medium text-ink">Suggested immediate actions</p>
              <ul className="ml-4 list-disc text-ink-muted">
                {result.immediateActions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {result.missingInfo.length > 0 && (
            <div>
              <p className="font-medium text-ink">Worth adding</p>
              <ul className="ml-4 list-disc text-ink-muted">
                {result.missingInfo.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-ink-muted">
            Everything is a suggestion — review each field, especially the RIDDOR
            flag, before submitting.
          </p>
        </div>
      )}
    </form>
  );
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
