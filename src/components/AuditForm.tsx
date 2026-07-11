"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAudit } from "@/app/(app)/audits/actions";
import {
  AUDIT_SECTIONS,
  itemId,
  scoreResponses,
  scoreTone,
  type AuditResult,
  type AuditResponse,
} from "@/lib/auditTemplate";
import type { Staff, Project } from "@/lib/types";

const initialState: { error?: string } = {};
const RESULTS: { value: AuditResult; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "na", label: "N/A" },
];

const TONE_TEXT = {
  ok: "text-ok-700", warn: "text-warn-700", danger: "text-danger-600", neutral: "text-ink-muted",
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : "Save audit"}
    </button>
  );
}

export function AuditForm({ staff, projects }: { staff: Staff[]; projects: Project[] }) {
  const [state, formAction] = useFormState(createAudit, initialState);

  // Default every item to "pass"; the auditor marks the exceptions.
  const [answers, setAnswers] = useState<Record<string, AuditResult>>(() => {
    const a: Record<string, AuditResult> = {};
    AUDIT_SECTIONS.forEach((s, si) => s.items.forEach((_, ii) => (a[itemId(si, ii)] = "pass")));
    return a;
  });

  const score = useMemo(() => {
    const responses: AuditResponse[] = [];
    AUDIT_SECTIONS.forEach((s, si) =>
      s.items.forEach((label, ii) =>
        responses.push({ category: s.category, label, result: answers[itemId(si, ii)] })
      )
    );
    return scoreResponses(responses);
  }, [answers]);
  const tone = scoreTone(score);

  return (
    <form action={formAction} className="space-y-4 pb-24">
      <fieldset className="card space-y-4 p-5">
        <div>
          <label htmlFor="project_id" className="label">
            Site / project <span className="text-danger-500">*</span>
          </label>
          <select id="project_id" name="project_id" className="field" required defaultValue="">
            <option value="" disabled>Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="audit_date" className="label">
              Date <span className="text-danger-500">*</span>
            </label>
            <input id="audit_date" name="audit_date" type="date" className="field" required />
          </div>
          <div>
            <label htmlFor="auditor_staff_id" className="label">Auditor</label>
            <select id="auditor_staff_id" name="auditor_staff_id" className="field" defaultValue="">
              <option value="">—</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {AUDIT_SECTIONS.map((section, si) => (
        <fieldset key={section.category} className="card p-5">
          <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {section.category}
          </legend>
          <div className="mt-2 divide-y divide-surface-border">
            {section.items.map((label, ii) => {
              const id = itemId(si, ii);
              return (
                <div key={id} className="py-3">
                  <p className="mb-2 text-sm text-ink">{label}</p>
                  <div className="flex gap-2">
                    {RESULTS.map((r) => {
                      const active = answers[id] === r.value;
                      const activeCls =
                        r.value === "pass" ? "border-ok-500 bg-ok-50 text-ok-700"
                        : r.value === "fail" ? "border-danger-500 bg-danger-50 text-danger-700"
                        : "border-navy-500 bg-navy-50 text-navy-700";
                      return (
                        <label
                          key={r.value}
                          className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-sm font-semibold ${
                            active ? activeCls : "border-surface-border text-ink-muted"
                          }`}
                        >
                          <input
                            type="radio" name={id} value={r.value} checked={active}
                            onChange={() => setAnswers((a) => ({ ...a, [id]: r.value }))}
                            className="sr-only"
                          />
                          {r.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <fieldset className="card p-5">
        <label htmlFor="notes" className="label">Notes</label>
        <textarea id="notes" name="notes" rows={3} className="field" />
      </fieldset>

      {state?.error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {state.error}
        </p>
      )}

      {/* Sticky live score + submit */}
      <div className="fixed inset-x-0 bottom-0 border-t border-surface-border bg-surface/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="text-center">
            <div className={`text-2xl font-bold leading-none ${TONE_TEXT[tone]}`}>
              {score == null ? "—" : `${score}%`}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-ink-faint">Score</div>
          </div>
          <div className="flex-1"><SubmitButton /></div>
        </div>
      </div>
    </form>
  );
}
