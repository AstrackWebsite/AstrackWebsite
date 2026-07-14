"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadRams, scanRamsAction } from "@/app/(app)/projects/rams-actions";

export function RamsPanel({
  projectId,
  ramsLink,
  ramsFileUrl,
  hasFile,
  summary,
  aiEnabled,
}: {
  projectId: string;
  ramsLink: string | null;
  ramsFileUrl: string | null;
  hasFile: boolean;
  summary: string | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scanning, startScan] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const onUpload = (formData: FormData) => {
    setError(null);
    if (!fileName) {
      setError("Choose a RAMS file first.");
      return;
    }
    startTransition(async () => {
      const res = await uploadRams(projectId, formData);
      if (res?.error) setError(res.error);
      else {
        setFileName("");
        router.refresh();
      }
    });
  };

  const onScan = () => {
    setError(null);
    startScan(async () => {
      const res = await scanRamsAction(projectId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {(ramsLink || hasFile) && (
        <div className="flex flex-wrap items-center gap-2">
          {ramsLink && (
            <a
              href={ramsLink}
              target="_blank"
              rel="noopener"
              className="btn-secondary px-3 py-2 text-sm"
            >
              RAMS reference / link
            </a>
          )}
          {hasFile && ramsFileUrl && (
            <a
              href={ramsFileUrl}
              target="_blank"
              rel="noopener"
              className="btn-secondary px-3 py-2 text-sm"
            >
              View uploaded RAMS
            </a>
          )}
          {hasFile && aiEnabled && (
            <button
              type="button"
              onClick={onScan}
              disabled={scanning}
              className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
            >
              {scanning ? "Scanning…" : summary ? "Re-scan with AI" : "Scan with AI"}
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="rounded-lg border border-surface-border bg-surface-muted p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            AI summary
          </p>
          <p className="whitespace-pre-wrap text-sm text-ink">{summary}</p>
        </div>
      )}

      <form action={onUpload} className="space-y-2">
        <label className="btn-secondary block w-full cursor-pointer text-center">
          {fileName || (hasFile ? "Replace RAMS file" : "Upload RAMS (PDF or image)")}
          <input
            type="file"
            name="file"
            accept="application/pdf,image/*"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
        {fileName && (
          <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-50">
            {pending ? "Uploading…" : "Save RAMS"}
          </button>
        )}
        <p className="text-xs text-ink-faint">PDF or image · up to 15MB.</p>
      </form>

      {error && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
