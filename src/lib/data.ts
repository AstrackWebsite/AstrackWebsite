import { createClient } from "./supabase/server";
import type { Staff, Project, Client, SiteRegisterEntry, StaffRole } from "./types";

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
