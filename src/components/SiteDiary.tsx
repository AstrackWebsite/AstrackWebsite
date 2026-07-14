"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSiteLog } from "@/app/(app)/projects/site-log-actions";
import { formatDate, formatTime, todayISO as getToday } from "@/lib/format";
import { enqueue } from "@/lib/offline/outbox";
import { useOutbox } from "@/lib/offline/useOutbox";

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

export interface DiaryEntry {
  id: string;
  logDate: string;
  category: string | null;
  note: string;
  authorName: string | null;
  createdAt: string;
}

export interface DiaryStaff {
  id: string;
  name: string;
}

const CATEGORIES = [
  "Induction",
  "Daily checks",
  "Works",
  "Delivery",
  "Weather",
  "Visitor",
  "Note",
];

export function SiteDiary({
  projectId,
  entries,
  staff,
  todayISO,
}: {
  projectId: string;
  entries: DiaryEntry[];
  staff: DiaryStaff[];
  todayISO: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const queued = useOutbox(projectId, ["site_log"]);

  const hasToday =
    entries.some((e) => e.logDate === todayISO) ||
    queued.some((q) => String(q.payload.log_date) === todayISO);

  const queueLog = (fd: FormData) => {
    const note = String(fd.get("note") ?? "").trim();
    if (!note) {
      setError("Write a short note for the log.");
      return false;
    }
    enqueue("site_log", projectId, {
      log_date: getToday(),
      category: String(fd.get("category") ?? "") || null,
      note,
      author_staff_id: String(fd.get("author_staff_id") ?? "") || null,
    });
    return true;
  };

  const onSubmit = (formData: FormData) => {
    setError(null);
    if (isOffline()) {
      if (queueLog(formData)) setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        const res = await addSiteLog(projectId, formData);
        if (res?.error) setError(res.error);
        else {
          setOpen(false);
          router.refresh();
        }
      } catch {
        if (queueLog(formData)) setOpen(false);
      }
    });
  };

  return (
    <div>
      {!open && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary px-3 py-2 text-sm">
            + Add entry
          </button>
        </div>
      )}

      {!hasToday && !open && (
        <p className="mb-3 rounded-lg bg-warn-50 px-3 py-2 text-sm font-medium text-warn-700">
          No log for today yet — HSE expect a daily site log.
        </p>
      )}

      {open && (
        <form action={onSubmit} className="mb-4 space-y-3 border-b border-surface-border pb-4">
          <div>
            <label htmlFor="category" className="label">Category</label>
            <select id="category" name="category" className="field" defaultValue="Works">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="note" className="label">
              What happened <span className="text-danger-500">*</span>
            </label>
            <textarea id="note" name="note" rows={3} className="field" required
              placeholder="e.g. Enclosure inspected, smoke test passed, stripping commenced in room 2." />
          </div>
          <div>
            <label htmlFor="author_staff_id" className="label">Logged by</label>
            <select id="author_staff_id" name="author_staff_id" className="field" defaultValue="">
              <option value="">—</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">{error}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Saving…" : "Save entry"}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {entries.length === 0 && queued.length === 0 && (
          <li className="text-sm text-ink-muted">No log entries yet.</li>
        )}
        {queued.map((q) => {
          const authorId = q.payload.author_staff_id ? String(q.payload.author_staff_id) : null;
          return (
            <li key={q.id} className="rounded-lg border border-warn-500/30 bg-warn-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  {q.payload.category ? String(q.payload.category) : "Note"}
                </span>
                <span className="pill pill-warn">Pending sync</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                {String(q.payload.note)}
              </p>
              {authorId && staffName.get(authorId) && (
                <p className="mt-1 text-xs text-ink-faint">— {staffName.get(authorId)}</p>
              )}
            </li>
          );
        })}
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border border-surface-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{e.category ?? "Note"}</span>
              <span className="text-xs text-ink-faint">
                {formatDate(e.logDate)} · {formatTime(e.createdAt)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{e.note}</p>
            {e.authorName && (
              <p className="mt-1 text-xs text-ink-faint">— {e.authorName}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
