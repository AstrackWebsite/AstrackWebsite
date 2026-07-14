"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  scanAndFileCertificate,
  fileScannedCertificate,
  type ScanFileState,
} from "@/app/(app)/staff/cert-actions";
import { CERT_FIELD_LABEL } from "@/lib/certFields";
import { formatDate } from "@/lib/format";

interface StaffOpt {
  id: string;
  name: string;
}

export function ScanFileCertificate({ staff }: { staff: StaffOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ScanFileState>({});
  const [fileName, setFileName] = useState("");
  const [chosen, setChosen] = useState("");

  const reset = () => {
    setState({});
    setFileName("");
    setChosen("");
  };

  const onScan = (formData: FormData) => {
    startTransition(async () => {
      const res = await scanAndFileCertificate({}, formData);
      setState(res);
      if ("ok" in res && res.ok && res.matched) router.refresh();
    });
  };

  const onConfirm = (filePath: string, rows: unknown) => {
    if (!chosen) return;
    const fd = new FormData();
    fd.set("staff_id", chosen);
    fd.set("file_path", filePath);
    fd.set("rows", JSON.stringify(rows));
    startTransition(async () => {
      const res = await fileScannedCertificate({}, fd);
      setState(res);
      if ("ok" in res && res.ok) router.refresh();
    });
  };

  const matched = "ok" in state && state.ok && state.matched;
  const unmatched = "ok" in state && state.ok && !state.matched;
  const errored = "ok" in state && !state.ok;

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Scan &amp; file a certificate
      </h2>
      <p className="mb-3 text-xs text-ink-faint">
        Photograph or upload a certificate — AsTrack reads it and files it to the
        matching staff member, updating their expiry dates.
      </p>

      {/* Success */}
      {matched && (
        <div className="rounded-lg bg-ok-50 p-3">
          <p className="font-semibold text-ok-700">✓ Filed to {state.staffName}</p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink">
            {state.filed.map((f, i) => (
              <li key={i}>
                {f.label}
                {f.expiry ? ` — expires ${formatDate(f.expiry)}` : " — no expiry read"}
              </li>
            ))}
          </ul>
          <button type="button" onClick={reset} className="btn-secondary mt-3 px-3 py-2 text-sm">
            Scan another
          </button>
        </div>
      )}

      {/* Couldn't auto-match — pick the person */}
      {unmatched && (
        <div className="rounded-lg bg-warn-50 p-3">
          <p className="font-semibold text-warn-700">
            Couldn&apos;t match{state.holderName ? ` “${state.holderName}”` : " the name"} automatically.
          </p>
          <p className="mt-1 text-sm text-ink-muted">Choose who this certificate belongs to:</p>
          <ul className="mt-2 mb-2 space-y-0.5 text-sm text-ink">
            {state.rows.map((r, i) => (
              <li key={i}>
                {r.field ? CERT_FIELD_LABEL[r.field] ?? r.title : r.title}
                {r.expiryDate ? ` — expires ${formatDate(r.expiryDate)}` : ""}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <select
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              className="field flex-1"
              aria-label="Staff member"
            >
              <option value="">Select staff…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!chosen || pending}
              onClick={() => onConfirm(state.filePath, state.rows)}
              className="btn-primary px-4 py-2 text-sm"
            >
              File
            </button>
          </div>
          <button type="button" onClick={reset} className="mt-2 text-sm text-ink-muted">
            Cancel
          </button>
        </div>
      )}

      {/* Picker */}
      {!matched && !unmatched && (
        <form action={onScan}>
          <label className="btn-secondary w-full cursor-pointer text-center">
            {fileName || "📷 Scan certificate (photo or PDF)"}
            <input
              type="file"
              name="certificate"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </label>
          {errored && (
            <p className="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={!fileName || pending}
            className="btn-primary mt-3 w-full disabled:opacity-50"
          >
            {pending ? "Reading…" : "Scan & file"}
          </button>
        </form>
      )}
    </section>
  );
}
