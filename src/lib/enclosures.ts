// Special requirements an enclosure (work area) can carry. Kept framework-free
// so client forms, server actions and the project page can all import it.
// Ticking a requirement optionally captures a short detail (permit no., MEWP
// type, induction specifics).

export const ENCLOSURE_REQUIREMENTS = [
  {
    key: "isolations",
    label: "Isolations",
    detailLabel: "Isolation points / permit no.",
  },
  {
    key: "work_at_height",
    label: "Work at height (MEWP)",
    detailLabel: "MEWP type / access details",
  },
  {
    key: "site_inductions",
    label: "Site inductions",
    detailLabel: "Induction details",
  },
] as const;

export type EnclosureReqKey = (typeof ENCLOSURE_REQUIREMENTS)[number]["key"];

export interface EnclosureRequirement {
  required: boolean;
  detail: string;
}

export type SpecialRequirements = Partial<
  Record<EnclosureReqKey, EnclosureRequirement>
>;

export const REQUIREMENT_LABEL: Record<EnclosureReqKey, string> =
  Object.fromEntries(
    ENCLOSURE_REQUIREMENTS.map((r) => [r.key, r.label])
  ) as Record<EnclosureReqKey, string>;

/** Ticked requirements only, in canonical order — for display and reports. */
export function activeRequirements(
  sr: SpecialRequirements | null | undefined
): { key: EnclosureReqKey; label: string; detail: string }[] {
  if (!sr) return [];
  return ENCLOSURE_REQUIREMENTS.filter((r) => sr[r.key]?.required).map((r) => ({
    key: r.key,
    label: r.label,
    detail: sr[r.key]?.detail ?? "",
  }));
}
