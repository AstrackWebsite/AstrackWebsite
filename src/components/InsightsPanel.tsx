"use client";

import { useState, useTransition } from "react";
import type { InsightState, InsightTone } from "@/lib/ai/insightTypes";

const TONE: Record<InsightTone, string> = {
  default: "border-surface-border",
  ok: "border-ok-500/30 bg-ok-50",
  warn: "border-warn-500/30 bg-warn-50",
  danger: "border-danger-200 bg-danger-50",
};

const TONE_TITLE: Record<InsightTone, string> = {
  default: "text-ink",
  ok: "text-ok-700",
  warn: "text-warn-700",
  danger: "text-danger-700",
};

/**
 * Generic "AI insights" card. Takes a server action that returns an
 * {@link InsightState}. Used for exposure analytics and audit/risk insights.
 */
export function InsightsPanel({
  generate,
  title,
  blurb,
  cta = "Generate insights",
}: {
  generate: () => Promise<InsightState>;
  title: string;
  blurb: string;
  cta?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<InsightState | null>(null);

  const run = () => {
    startTransition(async () => {
      const res = await generate();
      setState(res);
    });
  };

  const result = state && state.ok ? state.result : null;
  const error = state && !state.ok ? state.error : undefined;

  return (
    <section className="card mb-4 space-y-3 border-accent-200 bg-accent-50/50 p-5">
      <div className="flex items-start gap-2">
        <SparkIcon />
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          <p className="text-sm text-ink-muted">{blurb}</p>
        </div>
      </div>

      <button type="button" onClick={run} disabled={pending} className="btn-secondary w-full">
        {pending ? "Analysing…" : result ? "Refresh insights" : cta}
      </button>

      {error && (
        <p className="rounded-lg bg-warn-50 px-3 py-2 text-sm font-medium text-warn-700">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-ink">{result.summary}</p>
          {result.sections.map((s, i) => {
            const tone = s.tone ?? "default";
            return (
              <div key={i} className={`rounded-lg border p-3 ${TONE[tone]}`}>
                <p className={`mb-1 text-sm font-semibold ${TONE_TITLE[tone]}`}>{s.title}</p>
                <ul className="ml-4 list-disc space-y-0.5 text-sm text-ink-muted">
                  {s.items.map((it, j) => (
                    <li key={j}>{it}</li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className="text-xs text-ink-faint">
            AI-generated from your records — a decision aid, not a substitute for
            professional judgement.
          </p>
        </div>
      )}
    </section>
  );
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
