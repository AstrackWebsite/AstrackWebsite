"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createIncident } from "@/app/(app)/incidents/actions";
import {
  INCIDENT_TYPE_LABEL,
  INCIDENT_SEVERITY_LABEL,
  RIDDOR_SUGGEST_TYPES,
  PLANT_LINKED_INCIDENT_TYPES,
} from "@/lib/roles";
import type { IncidentType, IncidentSeverity, Staff, Project, Plant } from "@/lib/types";

const initialState: { error?: string } = {};
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

export function IncidentForm({
  staff,
  projects,
  plant,
}: {
  staff: Staff[];
  projects: Project[];
  plant: Plant[];
}) {
  const [type, setType] = useState<IncidentType>("near_miss");
  const [riddor, setRiddor] = useState(false);
  const [state, formAction] = useFormState(createIncident, initialState);

  const onType = (t: IncidentType) => {
    setType(t);
    setRiddor(RIDDOR_SUGGEST_TYPES.includes(t)); // auto-flag reportable types
  };
  const showPlant = PLANT_LINKED_INCIDENT_TYPES.includes(type);

  return (
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
          <input id="title" name="title" className="field" placeholder="e.g. Operative cut hand on sheeting" required />
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
            <select id="severity" name="severity" className="field" defaultValue="">
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
          <textarea id="description" name="description" rows={4} className="field" />
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
          onChange={(e) => setRiddor(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-surface-border text-danger-600 focus:ring-danger-500"
        />
        <span className="text-sm">
          <span className="font-semibold text-ink">RIDDOR reportable</span>
          <span className="block text-ink-muted">
            {RIDDOR_SUGGEST_TYPES.includes(type)
              ? "Auto-flagged for this type — confirm and report to the HSE within the required timeframe."
              : "Tick if this event must be reported to the HSE under RIDDOR."}
          </span>
        </span>
      </label>

      {state?.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
