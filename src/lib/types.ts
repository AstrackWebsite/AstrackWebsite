// Domain types mirroring the Supabase schema.
// Kept hand-written for v1; can be generated via `supabase gen types` later.

export type StaffRole =
  | "contracts_manager"
  | "site_manager"
  | "site_supervisor"
  | "operative";

export type AppRole = "admin" | "management" | "site";

export type CompanyStatus = "pending" | "active" | "suspended";

export interface Company {
  id: string;
  name: string;
  status: CompanyStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  app_role: AppRole;
  is_platform_admin: boolean;
  staff_id: string | null;
}

/** Office roles run the full app; site supervisors get the on-site view only. */
export function isOfficeRole(role: AppRole | undefined | null): boolean {
  return role === "admin" || role === "management";
}

export type ProjectClassification = "licensed" | "nnlw" | "general";

export type ProjectStatus = "pending" | "setup" | "live" | "completed";

export type PlantType =
  | "vacuum"
  | "dcu"
  | "npu"
  | "smoke_machine"
  | "lead_110v"
  | "transformer"
  | "other";

export type AirMonitoringType =
  | "background"
  | "leak"
  | "reassurance"
  | "clearance";

export type AsbestosType = "chrysotile" | "amosite" | "crocidolite";

export type DocumentKind =
  | "rams"
  | "asb5"
  | "waste_note"
  | "air_cert"
  | "permit"
  | "isolation"
  | "photo"
  | "closeout_pack"
  | "other";

export interface Staff {
  id: string;
  company_id: string;
  name: string;
  role: StaffRole;
  contact: string | null;
  email: string | null;
  asbestos_training_expiry: string | null;
  medical_expiry: string | null;
  face_fit_expiry: string | null;
  mask_service_expiry: string | null;
  smsts_expiry: string | null;
  sssts_expiry: string | null;
  cm_training_expiry: string | null;
  years_in_trade: number | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  email: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  reference: string;
  address: string;
  classification: ProjectClassification;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  max_operatives: number | null;
  contracts_manager_id: string | null;
  supervisor_id: string | null;
  client_id: string | null;
  asb5_notification_date: string | null;
  rams_document_url: string | null;
  rams_file_path: string | null;
  rams_summary: string | null;
  contract_value: number | null;
  portal_token: string;
  portal_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteRegisterEntry {
  id: string;
  project_id: string;
  staff_id: string;
  entry_date: string;
  check_in: string | null;
  check_out: string | null;
  blocked: boolean;
  block_reason: string | null;
  checklist: { label: string; checked: boolean }[] | null;
  rpe: string | null;
  created_at: string;
}

export interface CloseoutDocument {
  id: string;
  company_id: string;
  project_id: string;
  doc_type: string;
  title: string | null;
  file_path: string;
  uploaded_at: string;
}

export interface StaffCertificate {
  id: string;
  company_id: string;
  staff_id: string;
  cert_field: string | null;
  title: string | null;
  file_path: string;
  expiry_date: string | null;
  issue_date: string | null;
  uploaded_at: string;
}

export interface Plant {
  id: string;
  asset_id: string;
  type: PlantType;
  name: string | null;
  cert_number: string | null;
  cert_expiry: string | null;
  test_reading: number | null;
  latest_service: string | null;
  retest_date: string | null;
  dop_test_date: string | null;
  created_at: string;
}

export interface ExposureRecord {
  id: string;
  project_id: string;
  staff_id: string;
  entry_date: string;
  task: string | null;
  asbestos_type: AsbestosType | null;
  shift1_start: string | null;
  shift1_end: string | null;
  shift2_start: string | null;
  shift2_end: string | null;
  mask_worn: string | null;
  mask_service_expiry_at_time: string | null;
  hours_exposure: number;
  fibre_level: number;
  twa_4h: number;
  created_at: string;
}

export interface PlantDailyCheck {
  id: string;
  project_id: string;
  plant_id: string;
  check_date: string;
  passed: boolean;
  is_start_of_project: boolean;
  created_at: string;
}

export interface AirMonitoringResult {
  id: string;
  project_id: string;
  type: AirMonitoringType;
  result_fml: number | null;
  pass: boolean | null;
  analyst_cert_url: string | null;
  supervisor_id: string | null;
  sampled_on: string | null;
  created_at: string;
}

export interface ProjectPlant {
  id: string;
  project_id: string;
  plant_id: string;
  assigned_at: string;
}

export interface Audit {
  id: string;
  company_id: string;
  project_id: string | null;
  auditor_staff_id: string | null;
  audit_date: string;
  score: number | null;
  responses: { category: string; label: string; result: "pass" | "fail" | "na" }[];
  notes: string | null;
  created_at: string;
}

export type IncidentType =
  | "injury"
  | "near_miss"
  | "fibre_release"
  | "dangerous_occurrence"
  | "equipment_failure"
  | "fault"
  | "other";

export type IncidentStatus = "open" | "investigating" | "closed";
export type IncidentSeverity = "minor" | "moderate" | "serious";

export interface Incident {
  id: string;
  company_id: string;
  project_id: string | null;
  plant_id: string | null;
  type: IncidentType;
  title: string;
  description: string | null;
  occurred_at: string;
  location: string | null;
  severity: IncidentSeverity | null;
  riddor_reportable: boolean;
  reported_by_staff_id: string | null;
  status: IncidentStatus;
  investigation_outcome: string | null;
  created_at: string;
}

export interface WorkArea {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  location: string | null;
  task_activity: string | null;
  special_requirements: import("./enclosures").SpecialRequirements | null;
  notes: string | null;
  plan_path: string | null;
  created_at: string;
}

export interface SiteShift {
  id: string;
  company_id: string;
  project_id: string;
  shift_date: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  created_at: string;
}

export interface SiteLog {
  id: string;
  company_id: string;
  project_id: string;
  log_date: string;
  author_staff_id: string | null;
  category: string | null;
  note: string;
  attachment_path: string | null;
  attachment_type: string | null;
  created_at: string;
}

export interface SiteVisitor {
  id: string;
  company_id: string;
  project_id: string;
  visit_date: string;
  name: string;
  organisation: string | null;
  purpose: string | null;
  time_in: string | null;
  time_out: string | null;
  created_at: string;
}

export interface ProjectReport {
  id: string;
  company_id: string;
  project_id: string;
  audience: "office" | "client";
  sections: string[];
  title: string | null;
  file_path: string;
  generated_by: string | null;
  generated_at: string;
}

export interface ProjectCloseout {
  id: string;
  project_id: string;
  plan_of_work_delivered: boolean;
  air_monitoring_complete: boolean;
  four_stage_clearance_commenced: boolean;
  cert_reoccupation_received: boolean;
  site_clearance_confirmed: boolean;
  documentation_confirmed: boolean;
  client_rating: number | null;
  client_comments: string | null;
  closeout_pdf_url: string | null;
  submitted_for_review_at: string | null;
  completed_at: string | null;
  created_at: string;
}
