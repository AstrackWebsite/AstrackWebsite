// Shared option lists for the site-diary logs (ART Weekly Site Diary).

// DCU daily inspection items (diary "DCU Register & Inspections").
export const DCU_CHECKS = [
  "Cleanliness level",
  "RCD tested",
  "Waste and fresh water supply",
  "Boiler functioning / gas supply",
  "CO alarm tested",
  "NPU function / manometer reading",
  "Up-to-date certification available",
  "Doors closing, signage and mirrors in place",
  "Towels, gels and nail brush in place",
  "Waste bags in place",
  "Heating function",
] as const;

export type DcuCheck = { label: string; checked: boolean };
