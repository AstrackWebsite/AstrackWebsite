import "server-only";

import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, AI_MODEL } from "./client";

// Air-monitoring report ingestion.
// -----------------------------------------------------------------------------
// An independent UKAS analyst's air-test certificate (usually a PDF) is read by
// Claude and turned into a structured result — sample type, fibre concentration,
// date and the lab's own stated pass/fail. The operator confirms before it is
// saved. AI populates, a human approves.

const AIR_TYPES = ["background", "leak", "reassurance", "clearance"] as const;
export type AirType = (typeof AIR_TYPES)[number];

const AirReportSchema = z.object({
  sample_type: z
    .enum([...AIR_TYPES, "unknown"] as [string, ...string[]])
    .describe(
      "The kind of air test. background = baseline before work. leak = leak/smoke test of the enclosure. reassurance = reassurance test outside the enclosure during works. clearance = the 4-stage clearance test after works (certificate of reoccupation). Use 'unknown' if not clearly stated."
    ),
  result_fml: z
    .number()
    .nullable()
    .describe(
      "The reported fibre concentration in fibres per millilitre (f/ml). Report the single headline result. If reported as '<0.01', use 0.01. Null if no numeric result is shown."
    ),
  result_is_less_than: z
    .boolean()
    .describe("True when the result was reported as a '< limit of detection' value rather than an exact figure."),
  sampled_on: z
    .string()
    .nullable()
    .describe("Date the samples were taken, in YYYY-MM-DD format. Null if not shown."),
  lab_name: z
    .string()
    .nullable()
    .describe("Name of the analyst company / UKAS laboratory, or null."),
  stated_result: z
    .enum(["pass", "fail", "not_stated"])
    .describe("The pass/fail conclusion stated on the certificate itself, if any."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence in the extracted sample type and result."),
});

export type AirReportResult = {
  sampleType: AirType | "unknown";
  resultFml: number | null;
  resultIsLessThan: boolean;
  sampledOn: string | null;
  labName: string | null;
  statedResult: "pass" | "fail" | "not_stated";
  confidence: "high" | "medium" | "low";
};

const SYSTEM_PROMPT = `You read UK asbestos air-monitoring certificates issued by independent UKAS-accredited analysts under CAR 2012 and HSG248.
Extract the headline fibre concentration, the type of test, the sampling date and the laboratory's own stated conclusion.
Be precise with numbers and units — results are in fibres per millilitre (f/ml) and are often very small (e.g. <0.01). Never invent a result you cannot see. UK dates are DD/MM/YYYY; always output YYYY-MM-DD.`;

/**
 * Reads an air-monitoring certificate (PDF or image) into a structured result.
 * @param base64 Base64-encoded file contents (no data: prefix).
 * @param mediaType MIME type, e.g. "application/pdf" or "image/jpeg".
 */
export async function scanAirReport(
  base64: string,
  mediaType: string
): Promise<AirReportResult> {
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
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(AirReportSchema) },
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Extract the air-monitoring result from this certificate.",
          },
        ],
      },
    ],
  });

  const parsed = message.parsed_output;
  if (!parsed) throw new Error("Could not read the air report.");

  return {
    sampleType: (AIR_TYPES as readonly string[]).includes(parsed.sample_type)
      ? (parsed.sample_type as AirType)
      : "unknown",
    resultFml: normaliseFml(parsed.result_fml),
    resultIsLessThan: parsed.result_is_less_than,
    sampledOn: normaliseDate(parsed.sampled_on),
    labName: parsed.lab_name?.trim() || null,
    statedResult: parsed.stated_result,
    confidence: parsed.confidence,
  };
}

function normaliseFml(value: number | null): number | null {
  if (value == null || Number.isNaN(value) || value < 0 || value > 1000) return null;
  return value;
}

function normaliseDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : trimmed;
}
