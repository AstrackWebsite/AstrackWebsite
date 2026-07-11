import type { StaffRole, ProjectStatus, ProjectClassification } from "./types";

/** Display order of staff groups on the Staff screen. */
export const STAFF_ROLE_ORDER: StaffRole[] = [
  "contracts_manager",
  "site_manager",
  "site_supervisor",
  "operative",
];

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  contracts_manager: "Contracts Manager",
  site_manager: "Site Manager",
  site_supervisor: "Site Supervisor",
  operative: "Operative",
};

/** Plural group heading. */
export const STAFF_ROLE_GROUP: Record<StaffRole, string> = {
  contracts_manager: "Contracts Managers",
  site_manager: "Site Managers",
  site_supervisor: "Site Supervisors",
  operative: "Operatives",
};

/** Short badge, e.g. CM / SM / Supv / Op. */
export const STAFF_ROLE_SHORT: Record<StaffRole, string> = {
  contracts_manager: "CM",
  site_manager: "SM",
  site_supervisor: "Supv",
  operative: "Op",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  pending: "Pending",
  setup: "Setup",
  live: "Live",
  completed: "Completed",
};

/** Pill styling class per project status. */
export const PROJECT_STATUS_PILL: Record<ProjectStatus, string> = {
  pending: "pill-neutral",
  setup: "pill-warn",
  live: "pill-ok",
  completed: "pill-neutral",
};

export const CLASSIFICATION_LABEL: Record<ProjectClassification, string> = {
  licensed: "Licensed",
  nnlw: "Non-Licensed (NNLW)",
  general: "General",
};

/** Projects counted as "active" for dashboard KPIs = anything not completed. */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  "pending",
  "setup",
  "live",
];
