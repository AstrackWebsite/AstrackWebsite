"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { draftIncident, type IncidentDraft } from "@/lib/ai/incidentAssist";
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

export type IncidentDraftState =
  | { ok: true; draft: IncidentDraft }
  | { ok: false; error: string }
  | Record<string, never>;

/**
 * Turns a free-text account into a structured incident draft with AI for the
 * reporter to review and edit. Read-only — never writes. The RIDDOR view is
 * provisional and must be confirmed by a person before submitting.
 */
export async function draftIncidentAction(
  _prev: IncidentDraftState,
  formData: FormData
): Promise<IncidentDraftState> {
  if (!AI_ENABLED) {
    return { ok: false, error: "AI drafting is not enabled on this account." };
  }
  const account = String(formData.get("account") ?? "").trim();
  if (account.length < 15) {
    return { ok: false, error: "Add a few more details about what happened." };
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Please sign in again." };

  try {
    const draft = await draftIncident(account);
    return { ok: true, draft };
  } catch (err) {
    return { ok: false, error: `Couldn't draft that — ${aiErrorReason(err)}. Fill the form in manually.` };
  }
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
