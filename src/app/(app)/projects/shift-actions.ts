"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

/**
 * Start today's shift for a project. Opens (or re-opens) the day's shift record
 * and moves a project that's still in setup to "live" — the job is in progress.
 */
export async function startShift(projectId: string) {
  const supabase = createClient();
  const today = todayISO();

  // Upsert the day's shift; if it already exists, clear any end time (re-open).
  const { error } = await supabase
    .from("site_shift")
    .upsert(
      { project_id: projectId, shift_date: today, started_at: new Date().toISOString(), ended_at: null },
      { onConflict: "project_id,shift_date" }
    );

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to start the shift." };
    return { error: "Could not start the shift. Please try again." };
  }

  // Move the project into "live" if it was still being set up.
  await supabase
    .from("project")
    .update({ status: "live" })
    .eq("id", projectId)
    .in("status", ["pending", "setup"]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { ok: true };
}

/**
 * End today's shift. Blocked until everyone on the register has signed out — you
 * can't close the day with people still on site.
 */
export async function endShift(projectId: string) {
  const supabase = createClient();
  const today = todayISO();

  const { data: onSite } = await supabase
    .from("site_register_entry")
    .select("id")
    .eq("project_id", projectId)
    .eq("entry_date", today)
    .not("check_in", "is", null)
    .is("check_out", null)
    .eq("blocked", false);

  if (onSite && onSite.length > 0) {
    return { error: "Sign everyone out before ending the shift." };
  }

  const { error } = await supabase
    .from("site_shift")
    .update({ ended_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("shift_date", today);

  if (error) return { error: "Could not end the shift. Please try again." };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
