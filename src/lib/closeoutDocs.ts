// Handover / closeout document types. Kept out of the "use server" actions file
// so client, server components and the PDF route can all import it.
export const CLOSEOUT_DOC_TYPES = [
  "clearance_certificate",
  "reoccupation_certificate",
  "waste_consignment",
  "air_report",
  "plan_of_work",
  "other",
] as const;

export type CloseoutDocType = (typeof CLOSEOUT_DOC_TYPES)[number];

export const CLOSEOUT_DOC_LABEL: Record<string, string> = {
  clearance_certificate: "4-stage clearance certificate",
  reoccupation_certificate: "Certificate of reoccupation",
  waste_consignment: "Waste consignment note",
  air_report: "Air monitoring report",
  plan_of_work: "Plan of work",
  other: "Other document",
};
