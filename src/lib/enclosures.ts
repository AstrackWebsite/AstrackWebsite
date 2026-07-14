// Enclosure (work area) requirements, set-up checks and smoke-test handover —
// modelled on the ART Weekly Site Diary. Kept framework-free so client forms,
// server actions and the project page can all import it.

// "Unique requirements" an enclosure can carry. Ticking one optionally captures
// a short detail (permit no., MEWP type, induction specifics).
export const ENCLOSURE_REQUIREMENTS = [
  { key: "isolations", label: "Isolations", detailLabel: "Isolation points / permit no." },
  { key: "hot_works", label: "Hot works", detailLabel: "Permit / precautions" },
  { key: "elevated_temps", label: "Elevated working temperatures", detailLabel: "Details" },
  { key: "confined_space", label: "Confined space", detailLabel: "Permit / details" },
  { key: "work_at_height", label: "Elevated platforms (MEWP)", detailLabel: "MEWP type / access" },
  { key: "quilling", label: "Quilling (shot blast)", detailLabel: "Details" },
  { key: "wet_injection", label: "Wet injection", detailLabel: "Details" },
  { key: "site_inductions", label: "Site inductions", detailLabel: "Induction details" },
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

// Enclosure set-up checks confirmed before the smoke test (ART diary 10-point
// list).
export const ENCLOSURE_SETUP_CHECKS = [
  "Enclosure constructed as per drawings",
  "Airlock, baglock, cubes and NPUs positioned as per drawings",
  "Adequate vision panels and/or CCTV for a 360° view",
  "Correct NPU to match the required calculations",
  "Anemometer checks complete",
  "Adequate flap deflection",
  "Flap displacement measuring stickers in the middle-stage airlock",
  "Warning signs and labels placed on, in and around the enclosure",
  "First aid and fire provisions outside the enclosure",
  "Enclosure drawings available outside the enclosure",
] as const;

export type SetupCheck = { label: string; checked: boolean };

export interface EnclosureSmokeTest {
  date: string;
  startTime: string;
  endTime: string;
  witness: string;
  analystHandover: boolean;
  fourStageComplete: boolean;
}

/** True when any smoke-test/handover field carries a value worth showing. */
export function hasSmokeTest(st: EnclosureSmokeTest | null | undefined): boolean {
  if (!st) return false;
  return Boolean(
    st.date ||
      st.startTime ||
      st.endTime ||
      st.witness ||
      st.analystHandover ||
      st.fourStageComplete
  );
}
