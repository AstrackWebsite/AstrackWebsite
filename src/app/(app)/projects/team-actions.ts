"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Assign a staff member to a project's team (office only — RLS enforces). */
export async function assignStaff(projectId: string, staffId: string) {
  if (!staffId) return { error: "Choose a staff member." };
  const supabase = createClient();
  const { error } = await supabase
    .from("project_staff")
    .insert({ project_id: projectId, staff_id: staffId });

  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: true }; // already on team
    if (error.code === "42501") return { error: "Only the office can assign the team." };
    return { error: "Could not assign to the team." };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Remove a staff member from a project's team. */
export async function unassignStaff(projectId: string, staffId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("project_staff")
    .delete()
    .eq("project_id", projectId)
    .eq("staff_id", staffId);

  if (error) {
    if (error.code === "42501") return { error: "Only the office can change the team." };
    return { error: "Could not update the team." };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
