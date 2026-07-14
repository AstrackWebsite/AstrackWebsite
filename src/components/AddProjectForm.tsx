"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProject, updateProject } from "@/app/(app)/projects/actions";
import { CLASSIFICATION_LABEL, NOTIFICATION_FORM } from "@/lib/roles";
import type { Staff, ProjectClassification } from "@/lib/types";

const initialState: { error?: string } = {};
const CLASSIFICATIONS: ProjectClassification[] = ["licensed", "nnlw", "general"];

export interface ProjectFormInitial {
  reference: string;
  address: string;
  classification: ProjectClassification;
  start_date: string | null;
  end_date: string | null;
  max_operatives: number | null;
  contract_value: number | null;
  contracts_manager_id: string | null;
  supervisor_id: string | null;
  asb5_notification_date: string | null;
  rams_document_url: string | null;
  client_name: string;
  client_contact: string | null;
  client_address: string | null;
  client_email: string | null;
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending
        ? editing
          ? "Saving…"
          : "Creating…"
        : editing
          ? "Save changes"
          : "Create project"}
    </button>
  );
}

/** Date columns come back as ISO — inputs want a bare YYYY-MM-DD. */
const dateVal = (d: string | null) => (d ? d.slice(0, 10) : "");
const numVal = (n: number | null) => (n == null ? "" : String(n));

export function AddProjectForm({
  cms,
  supervisors,
  initial,
  projectId,
  clientId,
}: {
  cms: Staff[];
  supervisors: Staff[];
  /** Present in edit mode — pre-fills every field. */
  initial?: ProjectFormInitial;
  projectId?: string;
  clientId?: string | null;
}) {
  const editing = Boolean(projectId);
  const [classification, setClassification] = useState<ProjectClassification>(
    initial?.classification ?? "licensed"
  );
  const action = editing
    ? updateProject.bind(null, projectId!, clientId ?? null)
    : createProject;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {/* Project information */}
      <fieldset className="card space-y-4 p-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Project information
        </legend>

        <Field name="reference" label="Project reference" required defaultValue={initial?.reference} />
        <Field name="address" label="Project address" required defaultValue={initial?.address} />

        <div className="grid grid-cols-2 gap-3">
          <Field name="start_date" label="Start date" type="date" required defaultValue={dateVal(initial?.start_date ?? null)} />
          <Field name="end_date" label="End date" type="date" defaultValue={dateVal(initial?.end_date ?? null)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field name="max_operatives" label="Max operatives" type="number" defaultValue={numVal(initial?.max_operatives ?? null)} />
          <Field name="contract_value" label="Contract value (£)" type="number" defaultValue={numVal(initial?.contract_value ?? null)} />
        </div>

        <div>
          <label htmlFor="contracts_manager_id" className="label">
            Contracts manager <span className="text-danger-500">*</span>
          </label>
          <select
            id="contracts_manager_id"
            name="contracts_manager_id"
            className="field"
            required
            defaultValue={initial?.contracts_manager_id ?? ""}
          >
            <option value="" disabled>Select…</option>
            {cms.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="supervisor_id" className="label">
            Supervisor <span className="text-danger-500">*</span>
          </label>
          <select
            id="supervisor_id"
            name="supervisor_id"
            className="field"
            required
            defaultValue={initial?.supervisor_id ?? ""}
          >
            <option value="" disabled>Select…</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Classification — drives required documents */}
      <fieldset className="card space-y-3 p-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Project type
        </legend>

        <div className="grid grid-cols-3 gap-2">
          {CLASSIFICATIONS.map((c) => (
            <label
              key={c}
              className={`flex min-h-tap cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-semibold ${
                classification === c
                  ? "border-navy-600 bg-navy-50 text-navy-700"
                  : "border-surface-border text-ink-muted"
              }`}
            >
              <input
                type="radio"
                name="classification"
                value={c}
                checked={classification === c}
                onChange={() => setClassification(c)}
                className="sr-only"
              />
              {c === "licensed" ? "Licensed" : c === "nnlw" ? "NNLW" : "Non-Licensed"}
            </label>
          ))}
        </div>

        <p className="text-xs text-ink-muted">
          {NOTIFICATION_FORM[classification]
            ? `${CLASSIFICATION_LABEL[classification]} work requires an ${NOTIFICATION_FORM[classification]} notification and RAMS. Record the ${NOTIFICATION_FORM[classification]} date when you have it — it won't block setup.`
            : `${CLASSIFICATION_LABEL[classification]} work requires RAMS.`}
        </p>

        {NOTIFICATION_FORM[classification] && (
          <Field
            name="asb5_notification_date"
            label={`${NOTIFICATION_FORM[classification]} notification date (optional)`}
            type="date"
            defaultValue={dateVal(initial?.asb5_notification_date ?? null)}
          />
        )}

        <Field
          name="rams_document_url"
          label="RAMS document (link or reference)"
          defaultValue={initial?.rams_document_url ?? ""}
        />
      </fieldset>

      {/* Client details */}
      <fieldset className="card space-y-4 p-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Client details
        </legend>
        <Field name="client_name" label="Client name" required defaultValue={initial?.client_name} />
        <Field name="client_contact" label="Contact number" type="tel" defaultValue={initial?.client_contact ?? ""} />
        <Field name="client_address" label="Address" defaultValue={initial?.client_address ?? ""} />
        <Field name="client_email" label="Email" type="email" defaultValue={initial?.client_email ?? ""} />
      </fieldset>

      {state?.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {state.error}
        </p>
      )}

      <SubmitButton editing={editing} />
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-danger-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="field"
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
}
