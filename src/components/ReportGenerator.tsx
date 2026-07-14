"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateAndSaveReports } from "@/app/(app)/projects/report-actions";
import {
  REPORT_SECTIONS,
  ALL_SECTION_KEYS,
  SECTION_LABEL,
  type ReportSectionKey,
} from "@/lib/closeoutSections";
import { formatDate } from "@/lib/format";

export interface SavedReportRow {
  id: string;
  audience: "office" | "client";
  sections: string[];
  title: string | null;
  url: string | null;
  generatedAt: string;
}

export function ReportGenerator({
  projectId,
  reports,
}: {
  projectId: string;
  reports: SavedReportRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<ReportSectionKey>>(
    () => new Set(ALL_SECTION_KEYS)
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const chosen = ALL_SECTION_KEYS.filter((k) => selected.has(k));

  const toggle = (k: ReportSectionKey) => {
    setDone(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const allOn = chosen.length === ALL_SECTION_KEYS.length;
  const setAll = (on: boolean) => {
    setDone(false);
    setSelected(on ? new Set(ALL_SECTION_KEYS) : new Set());
  };

  const openReport = () => {
    if (chosen.length === 0) return;
    const qs = allOn ? "" : `?sections=${chosen.join(",")}`;
    window.open(`/projects/${projectId}/closeout/pdf${qs}`, "_blank", "noopener");
  };

  const saveCopies = () => {
    setError(null);
    setDone(false);
    const fd = new FormData();
    chosen.forEach((k) => fd.append("section", k));
    startTransition(async () => {
      const res = await generateAndSaveReports(projectId, fd);
      if (res?.error) setError(res.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Reports
      </h2>
      <p className="mb-3 mt-1 text-xs text-ink-faint">
        Choose the sections to include. Preview any combination, or file both a
        full office copy and a client copy (the selected sections only) to the
        project.
      </p>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">
          {chosen.length} of {ALL_SECTION_KEYS.length} sections
        </span>
        <button
          type="button"
          onClick={() => setAll(!allOn)}
          className="text-xs font-medium text-navy-600"
        >
          {allOn ? "Clear all" : "Select all"}
        </button>
      </div>

      <ul className="mb-4 space-y-1">
        {REPORT_SECTIONS.map((s) => (
          <li key={s.key}>
            <label className="flex min-h-tap cursor-pointer items-center gap-3 rounded-lg border border-surface-border px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(s.key)}
                onChange={() => toggle(s.key)}
                className="h-4 w-4"
              />
              <span className="text-sm text-ink">{s.label}</span>
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
      {done && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Office and client copies filed to the project.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={openReport}
          disabled={chosen.length === 0}
          className="btn-secondary flex-1 disabled:opacity-50"
        >
          Preview report
        </button>
        <button
          type="button"
          onClick={saveCopies}
          disabled={pending || chosen.length === 0}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {pending ? "Filing…" : "Approve & file office + client copies"}
        </button>
      </div>

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Filed reports
      </h3>
      <ul className="space-y-2">
        {reports.length === 0 && (
          <li className="text-sm text-ink-muted">No reports filed yet.</li>
        )}
        {reports.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-surface-border p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium text-ink">
                <span
                  className={`pill ${
                    r.audience === "client" ? "pill-ok" : "pill-neutral"
                  }`}
                >
                  {r.audience === "client" ? "Client" : "Office"}
                </span>
                <span className="truncate">{r.title ?? "Report"}</span>
              </p>
              <p className="truncate text-xs text-ink-muted">
                {r.sections.length} section{r.sections.length === 1 ? "" : "s"}
                {r.audience === "client" && r.sections.length
                  ? ` · ${r.sections
                      .map((k) => SECTION_LABEL[k as ReportSectionKey] ?? k)
                      .join(", ")}`
                  : ""}
                {" · "}
                {formatDate(r.generatedAt.slice(0, 10))}
              </p>
            </div>
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noopener"
                className="btn-secondary shrink-0 px-3 py-2 text-sm"
              >
                Download
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
