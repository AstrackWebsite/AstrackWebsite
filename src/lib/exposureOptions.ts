// Menu options for on-site exposure capture — picking from a list beats typing
// with gloves on. "Other…" always remains available for anything unusual, so
// nothing is lost by offering presets.

/** Common licensed/notifiable asbestos removal tasks. */
export const EXPOSURE_TASK_OPTIONS = [
  "Stripping AIB (insulating board)",
  "Removing pipe / boiler lagging (TCI)",
  "Removing sprayed coating",
  "Removing asbestos cement (AC) sheets",
  "Removing floor tiles / bitumen",
  "Soft strip / stripping out",
  "Bagging & removing waste",
  "Cleaning / decontamination",
  "Enclosure build / dismantle",
  "Inspection / air monitoring",
] as const;

/** Common RPE worn on asbestos jobs. */
export const RPE_OPTIONS = [
  "Sundström SR500 (PAPR)",
  "3M Jupiter / Versaflo (PAPR)",
  "Full-face + P3 filters",
  "Half-mask + P3 filters",
  "Disposable FFP3",
  "Air-fed hood / suit",
] as const;
