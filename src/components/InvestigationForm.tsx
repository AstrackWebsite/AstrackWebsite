"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateIncident } from "@/app/(app)/incidents/actions";
import { INCIDENT_STATUS_LABEL } from "@/lib/roles";
import type { IncidentStatus } from "@/lib/types";

const STATUSES: IncidentStatus[] = ["open", "investigating", "closed"];

export function InvestigationForm({
  incidentId,
  status,
  outcome,
}: {
  incidentId: string;
  status: IncidentStatus;
  outcome: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setMsg(null);
    start(async () => {
      const res = await updateIncident(incidentId, formData);
      setMsg(res?.error ?? "Saved.");
      if (!res?.error) router.refresh();
    });
  };

  return (
    <form action={onSubmit} className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Investigation
      </h2>
      <div>
        <label htmlFor="status" className="label">Status</label>
        <select id="status" name="status" className="field" defaultValue={status}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{INCIDENT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="investigation_outcome" className="label">Outcome / actions taken</label>
        <textarea
          id="investigation_outcome" name="investigation_outcome" rows={4}
          className="field" defaultValue={outcome ?? ""}
        />
      </div>
      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm font-medium ${
          msg === "Saved." ? "bg-ok-50 text-ok-700" : "bg-danger-50 text-danger-700"
        }`}>
          {msg}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save investigation"}
      </button>
    </form>
  );
}
