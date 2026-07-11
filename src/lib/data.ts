import { createClient } from "./supabase/server";
import type {
  Staff,
  Project,
  Client,
  SiteRegisterEntry,
  StaffRole,
  ExposureRecord,
  Plant,
  PlantDailyCheck,
  AirMonitoringResult,
} from "./types";

/** All non-archived staff, ordered by name. */
export async function getStaff(): Promise<Staff[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("archived", false)
    .order("name");
  return (data as Staff[]) ?? [];
}

export async function getStaffMember(id: string): Promise<Staff | null> {
  const supabase = createClient();
  const { data } = await supabase.from("staff").select("*").eq("id", id).single();
  return (data as Staff) ?? null;
}

export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project")
    .select("*")
    .order("start_date", { ascending: true });
  return (data as Project[]) ?? [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = createClient();
  const { data } = await supabase.from("project").select("*").eq("id", id).single();
  return (data as Project) ?? null;
}

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data } = await supabase.from("client").select("*").order("name");
  return (data as Client[]) ?? [];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = createClient();
  const { data } = await supabase.from("client").select("*").eq("id", id).single();
  return (data as Client) ?? null;
}

/** Staff of a given role, non-archived — for CM/supervisor pickers. */
export async function getStaffByRole(role: StaffRole): Promise<Staff[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("role", role)
    .eq("archived", false)
    .order("name");
  return (data as Staff[]) ?? [];
}

/** Today's site-register entries for a project. */
export async function getRegisterForDate(
  projectId: string,
  date: string
): Promise<SiteRegisterEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_register_entry")
    .select("*")
    .eq("project_id", projectId)
    .eq("entry_date", date)
    .order("created_at");
  return (data as SiteRegisterEntry[]) ?? [];
}

/** id → name lookup for resolving CM/supervisor references. */
export function staffNameMap(staff: Staff[]): Map<string, string> {
  return new Map(staff.map((s) => [s.id, s.name]));
}

// ── Exposure ───────────────────────────────────────────────────────────────
export async function getExposureForProject(
  projectId: string
): Promise<ExposureRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("exposure_record")
    .select("*")
    .eq("project_id", projectId)
    .order("entry_date", { ascending: false })
    .order("created_at");
  return (data as ExposureRecord[]) ?? [];
}

export async function getAllExposure(): Promise<ExposureRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("exposure_record")
    .select("*")
    .order("entry_date", { ascending: false });
  return (data as ExposureRecord[]) ?? [];
}

// ── Plant ────────────────────────────────────────────────────────────────
export async function getAllPlant(): Promise<Plant[]> {
  const supabase = createClient();
  const { data } = await supabase.from("plant").select("*").order("asset_id");
  return (data as Plant[]) ?? [];
}

/** Plant assigned to a project (via project_plant). */
export async function getProjectPlant(projectId: string): Promise<Plant[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_plant")
    .select("plant(*)")
    .eq("project_id", projectId);
  const rows = (data as unknown as { plant: Plant | Plant[] }[]) ?? [];
  return rows
    .map((r) => (Array.isArray(r.plant) ? r.plant[0] : r.plant))
    .filter(Boolean);
}

export async function getPlantChecks(
  projectId: string
): Promise<PlantDailyCheck[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("plant_daily_check")
    .select("*")
    .eq("project_id", projectId);
  return (data as PlantDailyCheck[]) ?? [];
}

// ── Air monitoring ─────────────────────────────────────────────────────────
export async function getAirMonitoring(): Promise<AirMonitoringResult[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("air_monitoring_result")
    .select("*")
    .order("sampled_on", { ascending: false });
  return (data as AirMonitoringResult[]) ?? [];
}

export async function getAirMonitoringForProject(
  projectId: string
): Promise<AirMonitoringResult[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("air_monitoring_result")
    .select("*")
    .eq("project_id", projectId)
    .order("sampled_on", { ascending: false });
  return (data as AirMonitoringResult[]) ?? [];
}
