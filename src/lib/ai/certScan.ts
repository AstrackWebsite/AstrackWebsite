import "server-only";

import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getClaude, AI_MODEL } from "./client";

// Certificate scanning.
// -----------------------------------------------------------------------------
// A photo (or PDF) of a training / medical / fit-test certificate is read by
// Claude and turned into structured expiry dates that map onto the staff
// record's columns. The user always confirms the result before it is saved —
// AI populates, a human approves.

/** Staff columns a scanned certificate can populate. */
export const CERT_FIELDS = [
  "asbestos_training_expiry",
  "medical_expiry",
  "face_fit_expiry",
  "mask_service_expiry",
  "smsts_expiry",
  "sssts_expiry",
  "cm_training_expiry",
] as const;

export type CertField = (typeof CERT_FIELDS)[number];

const CertificateSchema = z.object({
  holder_name: z
    .string()
    .nullable()
    .describe("Full name of the person the certificate belongs to, or null if not shown."),
  certificates: z
    .array(
      z.object({
        field: z
          .enum([...CERT_FIELDS, "unknown"] as [string, ...string[]])
          .describe(
            "Which AsTrack staff field this certificate maps to. asbestos_training_expiry = asbestos awareness / non-licensed / licensable work training. medical_expiry = medical examination under CAR 2012 (chest examination). face_fit_expiry = RPE face-fit test. mask_service_expiry = respirator / RPE service or inspection. smsts_expiry = SMSTS site management. sssts_expiry = SSSTS site supervision. cm_training_expiry = contracts manager training. Use 'unknown' if it does not clearly match one."
          ),
        title: z.string().describe("The certificate / course title exactly as printed."),
        expiry_date: z
          .string()
          .nullable()
          .describe(
            "Expiry / valid-until / renewal-due date in strict YYYY-MM-DD format. If only an issue date and a validity period are shown, compute the expiry. Null if no expiry can be determined."
          ),
        issue_date: z
          .string()
          .nullable()
          .describe("Issue / completion date in YYYY-MM-DD format, or null."),
        confidence: z
          .enum(["high", "medium", "low"])
          .describe("How confident you are in the field mapping and the expiry date."),
      })
    )
    .describe("One entry per distinct certificate or qualification found in the image."),
});

export type ScannedCertificate = z.infer<typeof CertificateSchema>;

/** A single detected certificate, with the field guaranteed to be a real column. */
export interface CertScanRow {
  field: CertField | "unknown";
  title: string;
  expiryDate: string | null;
  issueDate: string | null;
  confidence: "high" | "medium" | "low";
}

export interface CertScanResult {
  holderName: string | null;
  rows: CertScanRow[];
}

const SUPPORTED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const SYSTEM_PROMPT = `You are an assistant for a UK licensed asbestos removal contractor's compliance system.
You read photographs and PDFs of workers' training and medical certificates and extract the expiry dates.
Be precise: a misread expiry date could let an uncertified worker onto an asbestos site, which is a legal and safety failure.
Only report dates you can actually see or unambiguously compute. When a certificate shows an issue date plus a validity (e.g. "valid for 3 years"), compute the expiry. If a date is unclear, mark confidence "low" and, if you cannot read it at all, set the date to null rather than guessing.
UK certificates use DD/MM/YYYY. Always output dates as YYYY-MM-DD.`;

/**
 * Reads a certificate image or PDF and extracts structured expiry dates.
 * @param base64 Base64-encoded file contents (no data: prefix).
 * @param mediaType MIME type, e.g. "image/jpeg" or "application/pdf".
 */
export async function scanCertificate(
  base64: string,
  mediaType: string
): Promise<CertScanResult> {
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
    output_config: { format: zodOutputFormat(CertificateSchema) },
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: "Extract every certificate and its expiry date from this document. Map each to the correct AsTrack staff field.",
          },
        ],
      },
    ],
  });

  const parsed = message.parsed_output;
  if (!parsed) {
    throw new Error("Could not read the certificate.");
  }

  return {
    holderName: parsed.holder_name?.trim() || null,
    rows: parsed.certificates.map((c) => ({
      field: (CERT_FIELDS as readonly string[]).includes(c.field)
        ? (c.field as CertField)
        : "unknown",
      title: c.title,
      expiryDate: normaliseDate(c.expiry_date),
      issueDate: normaliseDate(c.issue_date),
      confidence: c.confidence,
    })),
  };
}

/** Accepts only well-formed YYYY-MM-DD dates; anything else becomes null. */
function normaliseDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : trimmed;
}

/** Whether a MIME type can be scanned. */
export function isScannable(mediaType: string): boolean {
  return mediaType === "application/pdf" || SUPPORTED_IMAGE.has(mediaType);
}
