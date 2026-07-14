import { createClient } from "./supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "./supabase/admin";
import { hasExpiredCert } from "./compliance";
import { ACTIVE_PROJECT_STATUSES } from "./roles";
import { isOfficeRole } from "./types";
import type {
  Staff,
  StaffCertificate,
  CloseoutDocument,
  Project,
  Client,
  SiteRegisterEntry,
  StaffRole,
  ExposureRecord,
  Plant,
  PlantDailyCheck,
  AirMonitoringResult,
  ProjectCloseout,
  Company,
  Profile,
  Incident,
  Audit,
  SiteLog,
  SiteVisitor,
  SiteShift,
  WorkArea,
} from "./types";

/** The signed-in user, their profile (tenant + role) and their company. */
export async function getMyContext(): Promise<{
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  company: Company | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, company: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, app_role, is_platform_admin, staff_id")
    .eq("id", user.id)
    .maybeSingle();

  let company: Company | null = null;
  if (profile?.company_id) {
    const { data } = await supabase
      .from("company")
      .select("*")
      .eq("id", profile.company_id)
      .maybeSingle();
    company = (data as Company) ?? null;
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: (profile as Profile) ?? null,
    company,
  };
}

/** All companies (platform-admin only — RLS enforces). Pending first. */
export async function getCompanies(): Promise<Company[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("company")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Company[]) ?? [];
}

export interface CompanyOverview {
  company: Company;
  staffCount: number;
  projectCount: number;
  activeProjectCount: number;
  turnover: number;
  flags: number;
}

/**
 * Platform-admin CRM data. A platform admin sees every company's staff and
 * projects (RLS allows it), so we aggregate per-company metrics here.
 */
export async function getPlatformOverview(): Promise<CompanyOverview[]> {
  const [companies, staff, projects] = await Promise.all([
    getCompanies(),
    getStaff(),
    getProjects(),
  ]);

  const now = new Date();
  return companies.map((company) => {
    const cStaff = staff.filter((s) => s.company_id === company.id);
    const cProjects = projects.filter((p) => p.company_id === company.id);
    return {
      company,
      staffCount: cStaff.length,
      projectCount: cProjects.length,
      activeProjectCount: cProjects.filter((p) =>
        ACTIVE_PROJECT_STATUSES.includes(p.status)
      ).length,
      turnover: cProjects.reduce((sum, p) => sum + (p.contract_value ?? 0), 0),
      flags: cStaff.filter((s) => hasExpiredCert(s, now)).length,
    };
  });
}

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

/**
 * Projects for the current user. Office roles see all the company's projects; a
 * site supervisor sees only the jobs they're assigned to supervise.
 */
export async function getProjectsForUser(): Promise<Project[]> {
  const { profile } = await getMyContext();
  const supabase = createClient();
  let query = supabase.from("project").select("*").order("start_date", { ascending: true });
  if (profile && !isOfficeRole(profile.app_role)) {
    // Site supervisor — only their assigned jobs (none until linked to a staff id).
    query = query.eq("supervisor_id", profile.staff_id ?? "00000000-0000-0000-0000-000000000000");
  }
  const { data } = await query;
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

/** All site-register entries for a project (all dates) — for the closeout pack. */
export async function getRegisterForProject(
  projectId: string
): Promise<SiteRegisterEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_register_entry")
    .select("*")
    .eq("project_id", projectId)
    .order("entry_date");
  return (data as SiteRegisterEntry[]) ?? [];
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

/** Handover documents attached to a project (most recent first). */
export async function getCloseoutDocuments(projectId: string): Promise<CloseoutDocument[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("closeout_document")
    .select("*")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });
  return (data as CloseoutDocument[]) ?? [];
}

/** Uploaded certificate documents for a staff member (most recent first). */
export async function getStaffCertificates(staffId: string): Promise<StaffCertificate[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("staff_certificate")
    .select("*")
    .eq("staff_id", staffId)
    .order("uploaded_at", { ascending: false });
  return (data as StaffCertificate[]) ?? [];
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

/** The staff assigned to a project's team (office picks who's on the job). */
export async function getProjectStaff(projectId: string): Promise<Staff[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_staff")
    .select("staff(*)")
    .eq("project_id", projectId);
  const rows = (data as unknown as { staff: Staff | Staff[] }[]) ?? [];
  return rows
    .map((r) => (Array.isArray(r.staff) ? r.staff[0] : r.staff))
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

// ── Audits ─────────────────────────────────────────────────────────────────
export async function getAudits(): Promise<Audit[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("audit")
    .select("*")
    .order("audit_date", { ascending: false });
  return (data as Audit[]) ?? [];
}

export async function getAudit(id: string): Promise<Audit | null> {
  const supabase = createClient();
  const { data } = await supabase.from("audit").select("*").eq("id", id).single();
  return (data as Audit) ?? null;
}

// ── Incidents ────────────────────────────────────────────────────────────
export async function getIncidents(): Promise<Incident[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("incident")
    .select("*")
    .order("occurred_at", { ascending: false });
  return (data as Incident[]) ?? [];
}

export async function getIncident(id: string): Promise<Incident | null> {
  const supabase = createClient();
  const { data } = await supabase.from("incident").select("*").eq("id", id).single();
  return (data as Incident) ?? null;
}

// ── Closeout ───────────────────────────────────────────────────────────────
export async function getCloseout(
  projectId: string
): Promise<ProjectCloseout | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_closeout")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  return (data as ProjectCloseout) ?? null;
}

// ── Site diary + visitors ────────────────────────────────────────────────────
export async function getSiteLog(projectId: string): Promise<SiteLog[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_log")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data as SiteLog[]) ?? [];
}

export async function getVisitors(projectId: string): Promise<SiteVisitor[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_visitor")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data as SiteVisitor[]) ?? [];
}

export async function getShiftForDate(
  projectId: string,
  date: string
): Promise<SiteShift | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_shift")
    .select("*")
    .eq("project_id", projectId)
    .eq("shift_date", date)
    .maybeSingle();
  return (data as SiteShift) ?? null;
}

// ── Work areas / enclosures ──────────────────────────────────────────────────
export async function getWorkAreas(projectId: string): Promise<WorkArea[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("work_area")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data as WorkArea[]) ?? [];
}

/** A short-lived signed URL for a plan file in the private "plans" bucket. */
export async function signPlanUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  // Prefer the service-role client so signing doesn't depend on storage RLS —
  // uploads go through the same client, so this keeps read/write symmetric.
  if (ADMIN_ENABLED) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("plans").createSignedUrl(path, 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  const supabase = createClient();
  const { data } = await supabase.storage.from("plans").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** A short-lived signed URL for a file in the private "attachments" bucket. */
export async function signAttachmentUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (ADMIN_ENABLED) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("attachments").createSignedUrl(path, 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  const supabase = createClient();
  const { data } = await supabase.storage.from("attachments").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
