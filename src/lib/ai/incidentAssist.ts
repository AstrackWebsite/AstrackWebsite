import "server-only";

import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, AI_MODEL } from "./client";

// Incident report assistant.
// -----------------------------------------------------------------------------
// A supervisor types (or dictates) a rough account of what happened on site.
// Claude turns it into a structured draft — a clean title, suggested type and
// severity, and a *provisional* view on RIDDOR reportability with its reasoning.
// This is decision support, not a decision: RIDDOR reportability is a legal
// judgement, so the draft is always presented for a human to confirm or change
// before anything is submitted. AI drafts, a human approves.

const INCIDENT_TYPES = [
  "injury",
  "near_miss",
  "fibre_release",
  "dangerous_occurrence",
  "equipment_failure",
  "fault",
  "other",
] as const;

const IncidentDraftSchema = z.object({
  title: z
    .string()
    .describe("A concise factual title, max ~10 words, e.g. 'Operative cut hand on metal sheeting'."),
  type: z
    .enum(INCIDENT_TYPES as unknown as [string, ...string[]])
    .describe(
      "Best-fit incident type. injury = personal injury. near_miss = no harm but could have. fibre_release = uncontrolled asbestos fibre release. dangerous_occurrence = RIDDOR Schedule 2 dangerous occurrence. equipment_failure = plant stopped working. fault = plant defect found. other = none of these."
    ),
  severity: z
    .enum(["minor", "moderate", "serious", "unknown"])
    .describe("Apparent severity from the account, or 'unknown' if unclear."),
  description: z
    .string()
    .describe("A tidied, neutral factual account in full sentences, preserving all details given. Do not invent facts."),
  riddor_reportable: z
    .boolean()
    .describe(
      "Provisional view on whether this is reportable to the HSE under RIDDOR 2013 (e.g. specified injuries, over-7-day incapacitation, dangerous occurrences, any uncontrolled asbestos fibre release). Err towards true when uncertain."
    ),
  riddor_reason: z
    .string()
    .describe("One or two sentences explaining the RIDDOR view in plain English, naming the likely category. Note that a human must confirm."),
  immediate_actions: z
    .array(z.string())
    .describe("Up to 4 short suggested immediate actions (make safe, isolate, medical, preserve scene, notify). Empty if none obvious."),
  missing_info: z
    .array(z.string())
    .describe("Up to 4 short prompts for important details the account is missing (time, exact injury, who was present, etc.). Empty if none."),
});

export type IncidentDraft = {
  title: string;
  type: (typeof INCIDENT_TYPES)[number];
  severity: "minor" | "moderate" | "serious" | "unknown";
  description: string;
  riddorReportable: boolean;
  riddorReason: string;
  immediateActions: string[];
  missingInfo: string[];
};

const SYSTEM_PROMPT = `You assist a UK licensed asbestos removal contractor in drafting accident/incident reports.
You know RIDDOR 2013 and CAR 2012. Turn a rough account into a clean, factual, structured draft.
Rules:
- Never invent facts. Only reorganise and clarify what you are told. If something important is missing, list it under missing_info rather than guessing.
- Your RIDDOR view is provisional decision-support only; a competent person must confirm it. When in doubt, flag as reportable.
- Any uncontrolled release of asbestos fibres is significant — treat it as reportable and serious.
- Keep language plain, neutral and non-speculative. No blame.`;

/** Turns a free-text account into a structured, reviewable incident draft. */
export async function draftIncident(account: string): Promise<IncidentDraft> {
  const client = getClaude();

  const message = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 1536,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(IncidentDraftSchema) },
    messages: [
      {
        role: "user",
        content: `Draft an incident report from this account:\n\n"""${account.slice(0, 4000)}"""`,
      },
    ],
  });

  const p = message.parsed_output;
  if (!p) throw new Error("Could not draft the report.");

  return {
    title: p.title.trim(),
    type: (INCIDENT_TYPES as readonly string[]).includes(p.type)
      ? (p.type as (typeof INCIDENT_TYPES)[number])
      : "other",
    severity: p.severity,
    description: p.description.trim(),
    riddorReportable: p.riddor_reportable,
    riddorReason: p.riddor_reason.trim(),
    immediateActions: p.immediate_actions.slice(0, 4),
    missingInfo: p.missing_info.slice(0, 4),
  };
}
