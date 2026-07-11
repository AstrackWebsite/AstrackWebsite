// Domain types mirroring the Supabase schema.
// Kept hand-written for v1; can be generated via `supabase gen types` later.

export type StaffRole =
  | "contracts_manager"
  | "site_manager"
  | "site_supervisor"
  | "operative";

export type AppRole = "admin" | "management" | "site";

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
  contract_value: number | null;
  created_at: string;
  updated_at: string;
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
