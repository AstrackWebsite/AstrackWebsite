"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAgencyStaff } from "@/app/(app)/projects/agency-actions";

export interface AgencyWorkerRow {
  id: string;
  name: string;
  roleShort: string;
}

export function AgencyWorkerAdd({
  projectId,
  workers,
}: {
  projectId: string;
  workers: AgencyWorkerRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (fd: FormData) => {
    setError(null);
    start(async () => {
      const res = await addAgencyStaff(projectId, fd);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div>
      <p className="mb-3 text-xs text-ink-faint">
        Add an agency / off-the-books worker to this job, then sign them onto the
        register. Record their tickets so cert-blocking still applies.
      </p>

      {!open && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            + Add agency worker
          </button>
        </div>
      )}

      {open && (
        <form action={onSubmit} className="mb-4 space-y-3 border-b border-surface-border pb-4">
          <div>
            <label htmlFor="ag_name" className="label">
              Name <span className="text-danger-500">*</span>
            </label>
            <input id="ag_name" name="name" className="field" required placeholder="Worker name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="ag_role" className="label">Role</label>
              <select id="ag_role" name="role" className="field" defaultValue="operative">
                <option value="operative">Operative</option>
                <option value="site_supervisor">Site Supervisor</option>
                <option value="site_manager">Site Manager</option>
              </select>
            </div>
            <div>
              <label htmlFor="ag_contact" className="label">Contact</label>
              <input id="ag_contact" name="contact" className="field" type="tel" />
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tickets (expiry)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="ag_asb" className="label">Asbestos training</label>
              <input id="ag_asb" name="asbestos_training_expiry" type="date" className="field" />
            </div>
            <div>
              <label htmlFor="ag_med" className="label">Medical</label>
              <input id="ag_med" name="medical_expiry" type="date" className="field" />
            </div>
            <div>
              <label htmlFor="ag_ff" className="label">Face fit</label>
              <input id="ag_ff" name="face_fit_expiry" type="date" className="field" />
            </div>
            <div>
              <label htmlFor="ag_mask" className="label">Mask service</label>
              <input id="ag_mask" name="mask_service_expiry" type="date" className="field" />
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Adding…" : "Add worker"}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {workers.length === 0 && <li className="text-sm text-ink-muted">No agency workers on this job.</li>}
        {workers.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border p-3">
            <span className="font-medium text-ink">{w.name}</span>
            <span className="flex items-center gap-2">
              <span className="pill pill-neutral">Agency</span>
              <span className="text-xs text-ink-muted">{w.roleShort}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
