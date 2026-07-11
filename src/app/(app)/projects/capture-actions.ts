"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import type { AsbestosType } from "@/lib/types";

const ASBESTOS: AsbestosType[] = ["chrysotile", "amosite", "crocidolite"];

/** Record an exposure entry for an operative on the project (Rule 4 data). */
export async function addExposure(projectId: string, formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const staff_id = get("staff_id");
  const fibre = Number(get("fibre_level"));
  const hours = Number(get("hours_exposure"));

  if (!staff_id) return { error: "Choose an operative." };
  if (!Number.isFinite(fibre) || fibre < 0)
    return { error: "Enter a valid fibre level (f/ml)." };
  if (!Number.isFinite(hours) || hours <= 0)
    return { error: "Enter the hours of exposure (from the shift times)." };

  const asbestos = get("asbestos_type");
  const supabase = createClient();

  const { error } = await supabase.from("exposure_record").insert({
    project_id: projectId,
    staff_id,
    entry_date: todayISO(),
    task: get("task") || null,
    asbestos_type: ASBESTOS.includes(asbestos as AsbestosType) ? asbestos : null,
    shift1_start: get("shift1_start") || null,
    shift1_end: get("shift1_end") || null,
    shift2_start: get("shift2_start") || null,
    shift2_end: get("shift2_end") || null,
    mask_worn: get("mask_worn") || null,
    hours_exposure: hours,
    fibre_level: fibre,
  });

  if (error) return { error: "Could not save exposure record." };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/**
 * Log today's daily check for a piece of plant (Rule 5). The first ever check
 * for a plant on a project is flagged as the start-of-project confirmation.
 */
export async function logPlantCheck(projectId: string, plantId: string) {
  const supabase = createClient();

  const { count } = await supabase
    .from("plant_daily_check")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("plant_id", plantId);

  const isStart = (count ?? 0) === 0;

  const { error } = await supabase.from("plant_daily_check").insert({
    project_id: projectId,
    plant_id: plantId,
    check_date: todayISO(),
    passed: true,
    is_start_of_project: isStart,
  });

  // Ignore "already checked today" unique-constraint conflicts.
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { error: "Could not log the plant check." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
