"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { IncidentType, IncidentSeverity, IncidentStatus } from "@/lib/types";

const TYPES: IncidentType[] = [
  "injury", "near_miss", "fibre_release", "dangerous_occurrence",
  "equipment_failure", "fault", "other",
];
const SEVERITIES: IncidentSeverity[] = ["minor", "moderate", "serious"];
const STATUSES: IncidentStatus[] = ["open", "investigating", "closed"];

export async function createIncident(_prev: unknown, formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const type = get("type") as IncidentType;
  const title = get("title");
  const occurred = get("occurred_at");

  if (!TYPES.includes(type)) return { error: "Choose an incident type." };
  if (!title) return { error: "Enter a short title." };
  if (!occurred) return { error: "Enter when it happened." };

  const severity = get("severity");
  // The form sends an explicit "on"/"off" (pre-set from the type's RIDDOR default).
  const riddor = get("riddor_reportable") === "on";

  const supabase = createClient();
  const { error } = await supabase.from("incident").insert({
    type,
    title,
    description: get("description") || null,
    occurred_at: new Date(occurred).toISOString(),
    location: get("location") || null,
    severity: SEVERITIES.includes(severity as IncidentSeverity) ? severity : null,
    riddor_reportable: riddor,
    project_id: get("project_id") || null,
    plant_id: get("plant_id") || null,
    reported_by_staff_id: get("reported_by_staff_id") || null,
  });

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to report here." };
    return { error: "Could not save the report. Please try again." };
  }

  revalidatePath("/incidents");
  redirect("/incidents");
}

/** Management updates the investigation status / outcome. */
export async function updateIncident(incidentId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "") as IncidentStatus;
  const outcome = String(formData.get("investigation_outcome") ?? "").trim();
  if (!STATUSES.includes(status)) return { error: "Choose a status." };

  const supabase = createClient();
  const { error } = await supabase
    .from("incident")
    .update({ status, investigation_outcome: outcome || null })
    .eq("id", incidentId);

  if (error) {
    if (error.code === "42501") return { error: "Management access required." };
    return { error: "Could not update the incident." };
  }
  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  return { ok: true };
}
