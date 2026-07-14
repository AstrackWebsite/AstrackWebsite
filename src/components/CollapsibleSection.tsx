"use client";

import { useState, type ReactNode } from "react";

/**
 * A tap-to-open card section for the project workspace. Owns the card shell and
 * a full-width header (title + optional at-a-glance summary + chevron), so the
 * on-site page reads as a short, tidy accordion instead of one long scroll. The
 * section bodies live in their own components and render headless inside here.
 */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-tap w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-surface-muted"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {title}
          </span>
          {summary != null && (
            <span className="mt-0.5 block truncate text-sm text-ink-muted">{summary}</span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && <div className="border-t border-surface-border px-5 py-4">{children}</div>}
    </section>
  );
}
