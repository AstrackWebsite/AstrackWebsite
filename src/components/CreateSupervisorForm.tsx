"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createSupervisor, type CreateSupervisorState } from "@/app/(app)/team/actions";

const initial: CreateSupervisorState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Creating login…" : "Create supervisor login"}
    </button>
  );
}

export function CreateSupervisorForm({
  staff,
}: {
  staff: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(createSupervisor, initial);
  const created = "ok" in state && state.ok;
  const error = "error" in state ? state.error : undefined;

  return (
    <form action={formAction} className="card space-y-4 p-5" key={created ? "done" : "form"}>
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" className="field" placeholder="Supervisor's name" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email <span className="text-danger-500">*</span>
        </label>
        <input id="email" name="email" type="email" className="field" required placeholder="name@company.co.uk" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Temporary password <span className="text-danger-500">*</span>
        </label>
        <input id="password" name="password" className="field" required minLength={8} placeholder="At least 8 characters" />
        <p className="mt-1 text-xs text-ink-faint">
          Give this to the supervisor — they can change it after logging in.
        </p>
      </div>
      <div>
        <label htmlFor="staff_id" className="label">Link to staff record</label>
        <select id="staff_id" name="staff_id" className="field" defaultValue="">
          <option value="">— (link so their assigned jobs show)</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-faint">
          Linking to their staff record makes their assigned jobs appear under
          &quot;My Jobs&quot;.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
      {created && (
        <p className="rounded-lg bg-ok-50 px-3 py-2 text-sm font-medium text-ok-700">
          Login created for {state.email}. Share the email + temporary password
          with them.
        </p>
      )}

      <SaveButton />
    </form>
  );
}
