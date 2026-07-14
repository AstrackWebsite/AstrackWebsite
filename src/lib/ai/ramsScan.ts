import "server-only";

import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, AI_MODEL } from "./client";

// RAMS scanning.
// -----------------------------------------------------------------------------
// A photo or PDF of a Risk Assessment & Method Statement is read by Claude and
// distilled into a structured summary — scope, hazards, controls, RPE, waste —
// so the office can file the document and see its key points at a glance. This
// summarises an existing document; it does not replace a competent person's
// review.

const RamsSchema = z.object({
  scope: z
    .string()
    .describe("One or two sentences: the scope of works this RAMS covers."),
  work_type: z
    .enum(["licensed", "nnlw", "non_licensed", "unknown"])
    .describe(
      "Asbestos work classification indicated by the document. licensed = licensed work. nnlw = notifiable non-licensed work. non_licensed = non-notifiable non-licensed. unknown if not stated."
    ),
  key_hazards: z
    .array(z.string())
    .describe("The main hazards identified (e.g. asbestos fibre release, work at height)."),
  control_measures: z
    .array(z.string())
    .describe("The key control measures / method-statement steps."),
  rpe: z.string().nullable().describe("RPE/PPE specified, or null."),
  waste: z.string().nullable().describe("Waste handling / disposal notes, or null."),
});

export type ScannedRams = z.infer<typeof RamsSchema>;

const SUPPORTED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const SYSTEM_PROMPT = `You are an assistant for a UK licensed asbestos removal contractor's compliance system.
You read a Risk Assessment & Method Statement (RAMS) and summarise its key content accurately.
Only report what the document actually says — do not invent controls, hazards or classifications that aren't there. If something isn't stated, leave it out or return null.
Keep each hazard and control concise (a short phrase, not a paragraph).`;

/** Reads a RAMS image or PDF and extracts a structured summary. */
export async function scanRams(
  base64: string,
  mediaType: string
): Promise<ScannedRams> {
  const client = getClaude();

  const contentBlock =
    mediaType === "application/pdf"
      ? ({
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        })
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: base64,
          },
        });

  const message = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(RamsSchema) },
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Summarise this RAMS: scope, work classification, key hazards, control measures, RPE/PPE and waste handling.",
          },
        ],
      },
    ],
  });

  const parsed = message.parsed_output;
  if (!parsed) throw new Error("Could not read the RAMS.");
  return parsed;
}

/** Render a scanned RAMS into a readable text summary for storage/display. */
export function formatRamsSummary(r: ScannedRams): string {
  const typeLabel: Record<ScannedRams["work_type"], string> = {
    licensed: "Licensed",
    nnlw: "Notifiable non-licensed (NNLW)",
    non_licensed: "Non-licensed",
    unknown: "Not stated",
  };
  const lines: string[] = [];
  lines.push(`Scope: ${r.scope}`);
  lines.push(`Work type: ${typeLabel[r.work_type]}`);
  if (r.key_hazards.length)
    lines.push(`Key hazards: ${r.key_hazards.join("; ")}`);
  if (r.control_measures.length)
    lines.push(`Control measures: ${r.control_measures.join("; ")}`);
  if (r.rpe) lines.push(`RPE/PPE: ${r.rpe}`);
  if (r.waste) lines.push(`Waste: ${r.waste}`);
  return lines.join("\n");
}

/** Whether a MIME type can be scanned. */
export function isScannable(mediaType: string): boolean {
  return mediaType === "application/pdf" || SUPPORTED_IMAGE.has(mediaType);
}
