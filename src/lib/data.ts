import { createClient } from "./supabase/server";
import type { Staff, Project, Client } from "./types";

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

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data } = await supabase.from("client").select("*").order("name");
  return (data as Client[]) ?? [];
}

/** id → name lookup for resolving CM/supervisor references. */
export function staffNameMap(staff: Staff[]): Map<string, string> {
  return new Map(staff.map((s) => [s.id, s.name]));
}
