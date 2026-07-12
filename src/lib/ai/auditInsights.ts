import "server-only";

import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, AI_MODEL } from "./client";
import type { InsightResult } from "./insightTypes";

// Audit / risk insights.
// -----------------------------------------------------------------------------
// Claude reads the internal H&S audit history and surfaces recurring failings,
// the categories that fail most, and where to focus improvement — the kind of
// pattern that's hard to see one audit at a time. Read-only decision support.

export interface AuditSummary {
  date: string;
  site: string;
  score: number | null;
  fails: { category: string; label: string }[];
}

const InsightSchema = z.object({
  summary: z.string().describe("One or two sentences on the overall audit picture and trend."),
  sections: z
    .array(
      z.object({
        title: z.string().describe("Short heading, e.g. 'Recurring failings', 'Weakest categories', 'Focus next'."),
        tone: z.enum(["default", "ok", "warn", "danger"]).describe("danger for repeated safety-critical failings; warn for trends to watch; ok for strengths."),
        items: z.array(z.string()).describe("Short, specific bullets. Reference categories, counts and sites."),
      })
    )
    .describe("2-4 sections: recurring failings, weakest categories, and where to focus improvement."),
});

const SYSTEM_PROMPT = `You are a health-and-safety advisor for a UK licensed asbestos removal contractor, reviewing their internal site-audit history.
Identify patterns across audits: which checklist items and categories fail repeatedly, whether scores are trending up or down, and the highest-priority areas to fix (especially anything bearing on CAR 2012 compliance, enclosure integrity, RPE, decontamination or waste).
Rules: use only the data given; never invent findings. Be specific — name categories and counts. Prioritise by risk, not just frequency. Keep bullets short and actionable.`;

/** Analyses audit history into a structured insight for the audits screen. */
export async function analyzeAudits(audits: AuditSummary[]): Promise<InsightResult> {
  const client = getClaude();

  const blocks = audits
    .slice(0, 120)
    .map((a) => {
      const fails = a.fails.length
        ? a.fails.map((f) => `${f.category}: ${f.label}`).join("; ")
        : "no failures";
      return `${a.date} | ${a.site} | score ${a.score ?? "n/a"}% | fails: ${fails}`;
    })
    .join("\n");

  const message = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(InsightSchema) },
    messages: [
      {
        role: "user",
        content: `Audit history (one per line): date | site | score | failed items\n\n${blocks}`,
      },
    ],
  });

  const p = message.parsed_output;
  if (!p) throw new Error("Could not analyse audits.");
  return {
    summary: p.summary,
    sections: p.sections.map((s) => ({ title: s.title, tone: s.tone, items: s.items })),
  };
}
