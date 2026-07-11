// Standard internal H&S audit checklist for a licensed asbestos site.
// Fixed template for v1 (per-company custom templates come later). Shared by
// the audit form, the scoring, and the detail view so they can't drift.

export type AuditResult = "pass" | "fail" | "na";

export interface AuditSection {
  category: string;
  items: string[];
}

export const AUDIT_SECTIONS: AuditSection[] = [
  {
    category: "PPE & RPE",
    items: [
      "Correct PPE worn by all operatives",
      "RPE face-fit in date for everyone on site",
      "RPE pre-use checks carried out",
      "Decontamination procedure followed correctly",
    ],
  },
  {
    category: "Enclosure",
    items: [
      "Enclosure integrity intact (no breaches)",
      "Smoke test passed and recorded",
      "Airlocks / baglocks functioning",
      "Negative pressure maintained",
    ],
  },
  {
    category: "Plant & readings",
    items: [
      "Manometer readings recorded hourly",
      "NPU running and logged",
      "DCU operational and clean",
    ],
  },
  {
    category: "Paperwork on site",
    items: [
      "Plan of work on site and followed",
      "ASB5 / notification available on site",
      "Site register up to date",
      "Air monitoring certificates on site",
    ],
  },
  {
    category: "Housekeeping & waste",
    items: [
      "Waste double-bagged and wrapped",
      "Transit routes clear",
      "Waste consignment notes present",
    ],
  },
];

export interface AuditResponse {
  category: string;
  label: string;
  result: AuditResult;
}

/** Stable field id for an item in the form / responses. */
export function itemId(sectionIdx: number, itemIdx: number): string {
  return `q_${sectionIdx}_${itemIdx}`;
}

/** Score = passes / (passes + fails) × 100, N/A excluded. Null if nothing scored. */
export function scoreResponses(responses: AuditResponse[]): number | null {
  const scored = responses.filter((r) => r.result !== "na");
  if (scored.length === 0) return null;
  const passes = scored.filter((r) => r.result === "pass").length;
  return Math.round((passes / scored.length) * 100);
}

/** Colour band for a score. */
export function scoreTone(score: number | null): "ok" | "warn" | "danger" | "neutral" {
  if (score == null) return "neutral";
  if (score >= 90) return "ok";
  if (score >= 70) return "warn";
  return "danger";
}
