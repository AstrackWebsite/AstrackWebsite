"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Assign a plant asset to a project (office only — RLS enforces management). */
export async function assignPlant(projectId: string, plantId: string) {
  if (!plantId) return { error: "Choose a plant asset." };
  const supabase = createClient();
  const { error } = await supabase
    .from("project_plant")
    .insert({ project_id: projectId, plant_id: plantId });

  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: true }; // already assigned
    if (error.code === "42501") return { error: "Only the office can assign plant." };
    return { error: `Could not assign plant: ${error.message}` };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Remove a plant asset from a project. */
export async function unassignPlant(projectId: string, plantId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("project_plant")
    .delete()
    .eq("project_id", projectId)
    .eq("plant_id", plantId);

  if (error) {
    if (error.code === "42501") return { error: "Only the office can change plant." };
    return { error: `Could not update plant: ${error.message}` };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
