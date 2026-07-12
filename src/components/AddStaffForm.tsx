"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createStaff, scanStaffCertificate, type CertScanState } from "@/app/(app)/staff/actions";
import { fieldsForRole } from "@/lib/staffForm";
import { STAFF_ROLE_ORDER, STAFF_ROLE_LABEL } from "@/lib/roles";
import type { StaffRole } from "@/lib/types";

const initialSave: { error?: string } = {};
const initialScan: CertScanState = {};

const FIELD_LABEL: Record<string, string> = {
  asbestos_training_expiry: "Asbestos training",
  medical_expiry: "Medical",
  face_fit_expiry: "Face fit",
  mask_service_expiry: "Mask service",
  smsts_expiry: "SMSTS",
  sssts_expiry: "SSSTS",
  cm_training_expiry: "CM training",
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : "Save staff member"}
    </button>
  );
}

function ScanButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary w-full" disabled={pending}>
      {pending ? "Reading certificate…" : "Read dates from certificate"}
    </button>
  );
}

export function AddStaffForm({ aiEnabled }: { aiEnabled: boolean }) {
  const [role, setRole] = useState<StaffRole>("site_supervisor");
  const [state, formAction] = useFormState(createStaff, initialSave);
  const [values, setValues] = useState<Record<string, string>>({});
  const fields = fieldsForRole(role);

  function setValue(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  return (
    <>
      {aiEnabled && (
        <CertScanner
          onExtract={(field, value) => setValue(field, value)}
          onName={(name) =>
            setValues((v) => (v.name ? v : { ...v, name }))
          }
          knownFields={new Set(fields.map((f) => f.field.name))}
        />
      )}

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
          <input
            id="name"
            name="name"
            type="text"
            className="field"
            required
            value={values.name ?? ""}
            onChange={(e) => setValue("name", e.target.value)}
          />
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
              value={values[field.name] ?? ""}
              onChange={(e) => setValue(field.name, e.target.value)}
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

function CertScanner({
  onExtract,
  onName,
  knownFields,
}: {
  onExtract: (field: string, value: string) => void;
  onName: (name: string) => void;
  knownFields: Set<string>;
}) {
  const [scan, scanAction] = useFormState(scanStaffCertificate, initialScan);
  const [fileName, setFileName] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const appliedRef = useRef<CertScanState | null>(null);

  // Auto-fill the form once per successful scan. The operator still reviews
  // every value on screen and must press Save — AI populates, a human approves.
  useEffect(() => {
    if (appliedRef.current === scan) return;
    if ("ok" in scan && scan.ok) {
      appliedRef.current = scan;
      if (scan.result.holderName) onName(scan.result.holderName);
      for (const row of scan.result.rows) {
        if (row.field !== "unknown" && row.expiryDate) {
          onExtract(row.field, row.expiryDate);
        }
      }
    }
  }, [scan, onExtract, onName]);

  const rows = "ok" in scan && scan.ok ? scan.result.rows : [];
  const error = "ok" in scan && !scan.ok ? scan.error : undefined;

  return (
    <form
      ref={formRef}
      action={scanAction}
      className="card mb-4 space-y-3 border-accent-200 bg-accent-50/50 p-5"
    >
      <div className="flex items-start gap-2">
        <SparkIcon />
        <div>
          <h2 className="font-semibold text-ink">Scan a certificate</h2>
          <p className="text-sm text-ink-muted">
            Snap a photo or upload a PDF — the expiry dates fill in below for you
            to check.
          </p>
        </div>
      </div>

      <label className="btn-secondary w-full cursor-pointer text-center">
        {fileName || "Choose photo or PDF"}
        <input
          type="file"
          name="certificate"
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

      {rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            Found on this certificate
          </p>
          <ul className="space-y-1.5">
            {rows.map((row, i) => {
              const mapped = row.field !== "unknown" && knownFields.has(row.field);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-ink">
                      {row.field !== "unknown"
                        ? FIELD_LABEL[row.field] ?? row.title
                        : row.title}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {row.expiryDate ? `Expires ${row.expiryDate}` : "No expiry read"}
                      {!mapped && row.field === "unknown" && " · not linked to a field"}
                    </span>
                  </span>
                  <ConfidenceBadge level={row.confidence} />
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-ink-muted">
            Dates are filled in below. Please double-check anything marked{" "}
            <span className="font-medium">medium</span> or{" "}
            <span className="font-medium">low</span> before saving.
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
