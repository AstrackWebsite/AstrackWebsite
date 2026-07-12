"use client";

import { useState } from "react";
import { BackLink } from "@/components/BackLink";
import { useFormState, useFormStatus } from "react-dom";
import { createStaff } from "../actions";
import { fieldsForRole } from "@/lib/staffForm";
import { STAFF_ROLE_ORDER, STAFF_ROLE_LABEL } from "@/lib/roles";
import type { StaffRole } from "@/lib/types";

const initialState: { error?: string } = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : "Save staff member"}
    </button>
  );
}

export default function AddStaffPage() {
  const [role, setRole] = useState<StaffRole>("site_supervisor");
  const [state, formAction] = useFormState(createStaff, initialState);
  const fields = fieldsForRole(role);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href="/staff" label="Back to staff" />
        <h1 className="text-xl font-bold text-ink">Add Staff</h1>
      </div>

      <p className="mb-4 text-sm text-ink-muted">
        Fields adapt to the selected position — only what&apos;s legally required
        to deploy them to site.
      </p>

      <form action={formAction} className="card space-y-4 p-5">
        <div>
          <label htmlFor="role" className="label">
            Staff position
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className="field"
          >
            {STAFF_ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {STAFF_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="label">
            Name <span className="text-danger-500">*</span>
          </label>
          <input id="name" name="name" type="text" className="field" required />
        </div>

        {fields.map(({ field, required }) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="label">
              {field.label}{" "}
              {required && <span className="text-danger-500">*</span>}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              className="field"
              required={required}
            />
          </div>
        ))}

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
