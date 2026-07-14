"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadCloseoutDocument,
  deleteCloseoutDocument,
} from "@/app/(app)/projects/closeout-doc-actions";
import { CLOSEOUT_DOC_TYPES, CLOSEOUT_DOC_LABEL } from "@/lib/closeoutDocs";
import { formatDate } from "@/lib/format";

export interface CloseoutDocRow {
  id: string;
  docType: string;
  title: string | null;
  url: string | null;
  uploadedAt: string;
}

export function CloseoutDocuments({
  projectId,
  docs,
}: {
  projectId: string;
  docs: CloseoutDocRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await uploadCloseoutDocument(projectId, formData);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        setFileName("");
        router.refresh();
      }
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteCloseoutDocument(id, projectId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Handover Documents
        </h2>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            + Attach
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-ink-faint">
        Attach the real paperwork — clearance certificate, certificate of
        reoccupation, waste consignment notes, air reports.
      </p>

      {open && (
        <form action={onSubmit} className="mb-4 space-y-3 border-b border-surface-border pb-4">
          <div>
            <label htmlFor="doc_type" className="label">Document type</label>
            <select id="doc_type" name="doc_type" className="field" defaultValue="reoccupation_certificate">
              {CLOSEOUT_DOC_TYPES.map((t) => (
                <option key={t} value={t}>{CLOSEOUT_DOC_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="title" className="label">Reference / note (optional)</label>
            <input id="title" name="title" className="field" placeholder="e.g. UKAS lab ref, cert number" />
          </div>
          <div>
            <label className="label">File</label>
            <label className="btn-secondary w-full cursor-pointer text-center">
              {fileName || "📷 Photo or PDF"}
              <input
                type="file"
                name="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            <p className="mt-1 text-xs text-ink-faint">PDF or image · up to 15MB.</p>
          </div>
          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setError(null); setFileName(""); }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={pending || !fileName} className="btn-primary flex-1 disabled:opacity-50">
              {pending ? "Uploading…" : "Attach document"}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {docs.length === 0 && (
          <li className="text-sm text-ink-muted">No handover documents attached yet.</li>
        )}
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border p-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">
                {CLOSEOUT_DOC_LABEL[d.docType] ?? "Document"}
              </p>
              <p className="truncate text-xs text-ink-muted">
                {d.title ? `${d.title} · ` : ""}{formatDate(d.uploadedAt.slice(0, 10))}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {d.url && (
                <a href={d.url} target="_blank" rel="noopener" className="btn-secondary px-3 py-2 text-sm">
                  View
                </a>
              )}
              <button
                type="button"
                onClick={() => onDelete(d.id)}
                disabled={pending}
                className="text-sm font-medium text-danger-600"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error && !open && (
        <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
      )}
    </section>
  );
}
