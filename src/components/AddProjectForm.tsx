"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProject } from "@/app/(app)/projects/actions";
import { CLASSIFICATION_LABEL } from "@/lib/roles";
import type { Staff, ProjectClassification } from "@/lib/types";

const initialState: { error?: string } = {};
const CLASSIFICATIONS: ProjectClassification[] = ["licensed", "nnlw", "general"];

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Creating…" : "Create project"}
    </button>
  );
}

export function AddProjectForm({
  cms,
  supervisors,
}: {
  cms: Staff[];
  supervisors: Staff[];
}) {
  const [classification, setClassification] =
    useState<ProjectClassification>("licensed");
  const [state, formAction] = useFormState(createProject, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {/* Project information */}
      <fieldset className="card space-y-4 p-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Project information
        </legend>

        <Field name="reference" label="Project reference" required />
        <Field name="address" label="Project address" required />

        <div className="grid grid-cols-2 gap-3">
          <Field name="start_date" label="Start date" type="date" required />
          <Field name="end_date" label="End date" type="date" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field name="max_operatives" label="Max operatives" type="number" />
          <Field name="contract_value" label="Contract value (£)" type="number" />
        </div>

        <div>
          <label htmlFor="contracts_manager_id" className="label">
            Contracts manager <span className="text-danger-500">*</span>
          </label>
          <select id="contracts_manager_id" name="contracts_manager_id" className="field" required defaultValue="">
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
          <select id="supervisor_id" name="supervisor_id" className="field" required defaultValue="">
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
              {c === "licensed" ? "Licensed" : c === "nnlw" ? "Non-Licensed" : "General"}
            </label>
          ))}
        </div>

        <p className="text-xs text-ink-muted">
          {classification === "licensed"
            ? "Licensed work requires an ASB5 notification (≥14 days before start) and RAMS."
            : `${CLASSIFICATION_LABEL[classification]} work requires RAMS.`}
        </p>

        {classification === "licensed" && (
          <Field
            name="asb5_notification_date"
            label="ASB5 notification date"
            type="date"
            required
          />
        )}

        <Field name="rams_document_url" label="RAMS document (link or reference)" />
      </fieldset>

      {/* Client details */}
      <fieldset className="card space-y-4 p-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Client details
        </legend>
        <Field name="client_name" label="Client name" required />
        <Field name="client_contact" label="Contact number" type="tel" />
        <Field name="client_address" label="Address" />
        <Field name="client_email" label="Email" type="email" />
      </fieldset>

      {state?.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {state.error}
        </p>
      )}

      <CreateButton />
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-danger-500">*</span>}
      </label>
      <input id={name} name={name} type={type} className="field" required={required} />
    </div>
  );
}
