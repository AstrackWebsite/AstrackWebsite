import type { StaffRole } from "./types";

// Adaptive Add-Staff form (Rule 3): fields shown + required-ness vary by role.
// Shared by the form UI and the server action so validation can't drift.

export type StaffFieldType = "text" | "email" | "tel" | "date" | "number";

export interface StaffField {
  /** Column name on the staff table. */
  name: string;
  label: string;
  type: StaffFieldType;
}

/** All possible fields, keyed by column name. `name` (identity) is always shown. */
export const STAFF_FIELDS: Record<string, StaffField> = {
  contact: { name: "contact", label: "Contact number", type: "tel" },
  email: { name: "email", label: "Email address", type: "email" },
  asbestos_training_expiry: { name: "asbestos_training_expiry", label: "Asbestos training expiry", type: "date" },
  medical_expiry: { name: "medical_expiry", label: "Medical expiry", type: "date" },
  face_fit_expiry: { name: "face_fit_expiry", label: "Face fit expiry", type: "date" },
  mask_service_expiry: { name: "mask_service_expiry", label: "Mask service expiry", type: "date" },
  smsts_expiry: { name: "smsts_expiry", label: "SMSTS expiry", type: "date" },
  sssts_expiry: { name: "sssts_expiry", label: "SSSTS expiry", type: "date" },
  cm_training_expiry: { name: "cm_training_expiry", label: "CM training expiry", type: "date" },
  years_in_trade: { name: "years_in_trade", label: "Years in trade", type: "number" },
};

export interface RoleFormConfig {
  /** Mandatory columns (besides name, which is always mandatory). */
  mandatory: string[];
  /** Optional columns. */
  optional: string[];
}

/** Per-role field requirements, straight from the spec's Add-Staff tables. */
export const STAFF_FORM_CONFIG: Record<StaffRole, RoleFormConfig> = {
  contracts_manager: {
    mandatory: ["cm_training_expiry", "contact"],
    optional: ["email"],
  },
  site_manager: {
    mandatory: [
      "smsts_expiry",
      "asbestos_training_expiry",
      "medical_expiry",
      "face_fit_expiry",
      "mask_service_expiry",
      "contact",
    ],
    optional: ["email"],
  },
  site_supervisor: {
    mandatory: [
      "asbestos_training_expiry",
      "medical_expiry",
      "face_fit_expiry",
      "mask_service_expiry",
      "contact",
    ],
    optional: ["sssts_expiry", "email"],
  },
  operative: {
    mandatory: [
      "asbestos_training_expiry",
      "medical_expiry",
      "face_fit_expiry",
      "mask_service_expiry",
    ],
    optional: ["email", "years_in_trade", "contact"],
  },
};

/** Ordered fields for a role, each tagged required. `name` is added by the form. */
export function fieldsForRole(
  role: StaffRole
): { field: StaffField; required: boolean }[] {
  const cfg = STAFF_FORM_CONFIG[role];
  return [
    ...cfg.mandatory.map((n) => ({ field: STAFF_FIELDS[n], required: true })),
    ...cfg.optional.map((n) => ({ field: STAFF_FIELDS[n], required: false })),
  ];
}
