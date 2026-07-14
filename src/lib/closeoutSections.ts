// Selectable sections of the closeout / compliance report. Kept framework-free
// so client components, server actions and the PDF renderer can all import it.

export const REPORT_SECTIONS = [
  { key: "details", label: "Project details" },
  { key: "handover", label: "Analyst handover checklist" },
  { key: "documents", label: "Handover documents (attached files)" },
  { key: "register", label: "Site register" },
  { key: "rpe", label: "RPE inspection records" },
  { key: "exposure", label: "Personal exposure (TWA)" },
  { key: "plant", label: "Plant checks" },
  { key: "air", label: "Air monitoring" },
  { key: "feedback", label: "Client satisfaction" },
] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]["key"];

export const ALL_SECTION_KEYS: ReportSectionKey[] = REPORT_SECTIONS.map(
  (s) => s.key
);

const KEY_SET = new Set<string>(ALL_SECTION_KEYS);

export const SECTION_LABEL: Record<ReportSectionKey, string> = Object.fromEntries(
  REPORT_SECTIONS.map((s) => [s.key, s.label])
) as Record<ReportSectionKey, string>;

/**
 * Parse and validate a comma-separated section list (e.g. from a query string or
 * form field). Unknown keys are dropped. An empty/absent value means "all
 * sections" so existing links to the pack keep producing the full report.
 */
export function parseSections(raw: string | null | undefined): ReportSectionKey[] {
  if (!raw) return [...ALL_SECTION_KEYS];
  const picked = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ReportSectionKey => KEY_SET.has(s));
  return picked.length ? picked : [...ALL_SECTION_KEYS];
}
