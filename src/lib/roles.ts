import type {
  StaffRole,
  ProjectStatus,
  ProjectClassification,
  AsbestosType,
  AirMonitoringType,
  PlantType,
  IncidentType,
  IncidentStatus,
  IncidentSeverity,
} from "./types";

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

export const ASBESTOS_TYPE_LABEL: Record<AsbestosType, string> = {
  chrysotile: "Chrysotile (white)",
  amosite: "Amosite (brown)",
  crocidolite: "Crocidolite (blue)",
};

export const AIR_MONITORING_TYPE_LABEL: Record<AirMonitoringType, string> = {
  background: "Background",
  leak: "Leak",
  reassurance: "Reassurance",
  clearance: "Clearance",
};

export const PLANT_TYPE_LABEL: Record<PlantType, string> = {
  vacuum: "M-Class Vacuum",
  dcu: "Decontamination Unit (DCU)",
  npu: "Negative Pressure Unit (NPU)",
  smoke_machine: "Smoke Machine",
  lead_110v: "Lead (110v)",
  transformer: "Transformer",
  other: "Other plant",
};

/** Plant types that gate a Licensed project (start-of-project + daily checks). */
export const GATED_PLANT_TYPES: PlantType[] = ["dcu", "vacuum", "npu"];

// ── Incidents ────────────────────────────────────────────────────────────
export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  injury: "Injury",
  near_miss: "Near miss",
  fibre_release: "Uncontrolled fibre release",
  dangerous_occurrence: "Dangerous occurrence",
  equipment_failure: "Equipment failure",
  fault: "Equipment fault",
  other: "Other",
};

/** Types that are (or are likely) RIDDOR-reportable — used to auto-flag. */
export const RIDDOR_SUGGEST_TYPES: IncidentType[] = [
  "injury",
  "fibre_release",
  "dangerous_occurrence",
];

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  closed: "Closed",
};

export const INCIDENT_STATUS_PILL: Record<IncidentStatus, string> = {
  open: "pill-danger",
  investigating: "pill-warn",
  closed: "pill-ok",
};

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  serious: "Serious",
};

/** Equipment-related incident types link to a plant asset. */
export const PLANT_LINKED_INCIDENT_TYPES: IncidentType[] = [
  "equipment_failure",
  "fault",
];
