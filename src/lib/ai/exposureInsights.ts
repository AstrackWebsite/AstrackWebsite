import "server-only";

import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, AI_MODEL } from "./client";
import { CONTROL_LIMIT_FML } from "@/lib/compliance";
import type { InsightResult } from "./insightTypes";

// Exposure analytics.
// -----------------------------------------------------------------------------
// Claude reads the anonymised-by-first-name exposure dataset and highlights who
// is trending towards the control limit, which tasks/asbestos types drive the
// highest readings, and what a supervisor might do about it. Read-only decision
// support — the underlying records are unchanged.

export interface ExposureRow {
  name: string;
  task: string | null;
  asbestos: string | null;
  twa: number;
  date: string;
  project: string;
}

const InsightSchema = z.object({
  summary: z.string().describe("One or two sentences summarising the overall exposure picture."),
  sections: z
    .array(
      z.object({
        title: z.string().describe("Short section heading, e.g. 'Watchlist', 'Task patterns', 'Recommendations'."),
        tone: z
          .enum(["default", "ok", "warn", "danger"])
          .describe("danger only for readings at or over the control limit; warn for approaching; ok for reassurance."),
        items: z.array(z.string()).describe("Short, specific bullet points. Name people and figures where relevant."),
      })
    )
    .describe("2-4 sections. Aim for: a watchlist of operatives near/over the limit, task/asbestos-type patterns, and practical recommendations."),
});

const SYSTEM_PROMPT = `You are an occupational-hygiene analyst for a UK licensed asbestos removal contractor.
You review 4-hour time-weighted-average (TWA) personal exposure readings in fibres/ml against the CAR 2012 control limit of ${CONTROL_LIMIT_FML} f/ml.
Give a clear, honest read of the data: who is trending high, which tasks or asbestos types drive exposure, and concrete actions (RPE review, task rotation, method change, health surveillance).
Rules: use only the data given; never invent readings. Be specific with names and figures. Flag any reading at or over the control limit as danger. Keep bullets short and practical. Remember control measures should reduce exposure so far as reasonably practicable, not merely stay under the limit.`;

/** Analyses exposure rows into a structured insight for the monitoring screen. */
export async function analyzeExposure(rows: ExposureRow[]): Promise<InsightResult> {
  const client = getClaude();

  const table = rows
    .slice(0, 400)
    .map(
      (r) =>
        `${r.date} | ${r.name} | ${r.twa.toFixed(3)} f/ml | ${r.task ?? "-"} | ${r.asbestos ?? "-"} | ${r.project}`
    )
    .join("\n");

  const message = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(InsightSchema) },
    messages: [
      {
        role: "user",
        content: `Control limit: ${CONTROL_LIMIT_FML} f/ml (4h TWA).\nColumns: date | operative | 4h TWA | task | asbestos type | project\n\n${table}`,
      },
    ],
  });

  const p = message.parsed_output;
  if (!p) throw new Error("Could not analyse exposure.");
  return {
    summary: p.summary,
    sections: p.sections.map((s) => ({ title: s.title, tone: s.tone, items: s.items })),
  };
}
