"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Enable / disable a project's shareable client portal (management only). */
export async function setProjectPortal(projectId: string, enabled: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("project")
    .update({ portal_enabled: enabled })
    .eq("id", projectId);

  if (error) {
    if (error.code === "42501") return { error: "Management access required." };
    return { error: "Could not update the portal." };
  }
  revalidatePath("/client-portal");
  return { ok: true };
}
