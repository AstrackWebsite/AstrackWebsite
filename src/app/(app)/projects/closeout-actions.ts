"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { draftCloseoutSummary } from "@/lib/ai/closeoutSummary";
import {
  getProjectById,
  getClient,
  getMyContext,
  getAirMonitoringForProject,
  getRegisterForProject,
  getCloseout,
} from "@/lib/data";
import { CLASSIFICATION_LABEL } from "@/lib/roles";

const HANDOVER_ITEMS = [
  "plan_of_work_delivered",
  "air_monitoring_complete",
  "four_stage_clearance_commenced",
  "cert_reoccupation_received",
] as const;

export type CloseoutSummaryState =
  | { ok: true; summary: string }
  | { ok: false; error: string }
  | Record<string, never>;

/**
 * Drafts a client-facing completion summary for a project from its own record.
 * Read-only — the contractor edits and approves before sending. Gated behind
 * ANTHROPIC_API_KEY.
 */
export async function draftCloseoutSummaryAction(
  projectId: string
): Promise<CloseoutSummaryState> {
  if (!AI_ENABLED) {
    return { ok: false, error: "AI drafting is not enabled on this account." };
  }
  try {
    const project = await getProjectById(projectId);
    if (!project) return { ok: false, error: "Project not found." };

    const [ctx, client, air, register, closeout] = await Promise.all([
      getMyContext(),
      project.client_id ? getClient(project.client_id) : Promise.resolve(null),
      getAirMonitoringForProject(projectId),
      getRegisterForProject(projectId),
      getCloseout(projectId),
    ]);

    const operatives = new Set(register.map((r) => r.staff_id)).size;

    const summary = await draftCloseoutSummary({
      companyName: ctx.company?.name ?? "the contractor",
      clientName: client?.name ?? null,
      address: project.address,
      reference: project.reference,
      classification: CLASSIFICATION_LABEL[project.classification] ?? project.classification,
      startDate: project.start_date,
      endDate: project.end_date,
      operativeCount: operatives,
      airResults: air.map((r) => ({
        type: r.type,
        resultFml: r.result_fml,
        pass: r.pass,
        sampledOn: r.sampled_on,
      })),
      clearanceReceived: Boolean(closeout?.cert_reoccupation_received),
      siteClearanceConfirmed: Boolean(closeout?.site_clearance_confirmed),
    });

    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: `Couldn't draft the summary — ${aiErrorReason(err)}.` };
  }
}

/** Save closeout checklist progress without completing the project. */
export async function saveCloseout(projectId: string, formData: FormData) {
  const bool = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";
  const rating = Number(formData.get("client_rating") ?? 0);

  const supabase = createClient();
  const { error } = await supabase.from("project_closeout").upsert(
    {
      project_id: projectId,
      plan_of_work_delivered: bool("plan_of_work_delivered"),
      air_monitoring_complete: bool("air_monitoring_complete"),
      four_stage_clearance_commenced: bool("four_stage_clearance_commenced"),
      cert_reoccupation_received: bool("cert_reoccupation_received"),
      site_clearance_confirmed: bool("site_clearance_confirmed"),
      documentation_confirmed: bool("documentation_confirmed"),
      client_rating: rating >= 1 && rating <= 5 ? rating : null,
      client_comments: String(formData.get("client_comments") ?? "").trim() || null,
    },
    { onConflict: "project_id" }
  );

  if (error) {
    if (error.code === "42501") return { error: "Management access required." };
    return { error: "Could not save closeout." };
  }
  revalidatePath(`/projects/${projectId}/closeout`);
  return { ok: true };
}

/**
 * Complete the project (Rule 6). Handover cannot proceed until every analyst
 * handover item + site clearance + documentation are confirmed. On success the
 * project is marked completed and the closeout PDF pack becomes available.
 */
export async function completeProject(projectId: string, formData: FormData) {
  const bool = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";

  for (const item of HANDOVER_ITEMS) {
    if (!bool(item))
      return { error: "All analyst-handover items must be checked before completing." };
  }
  if (!bool("site_clearance_confirmed"))
    return { error: "Confirm site clearance before completing." };
  if (!bool("documentation_confirmed"))
    return { error: "Confirm all documentation is uploaded before completing." };

  const rating = Number(formData.get("client_rating") ?? 0);
  const supabase = createClient();

  const { error: closeErr } = await supabase.from("project_closeout").upsert(
    {
      project_id: projectId,
      plan_of_work_delivered: true,
      air_monitoring_complete: true,
      four_stage_clearance_commenced: true,
      cert_reoccupation_received: true,
      site_clearance_confirmed: true,
      documentation_confirmed: true,
      client_rating: rating >= 1 && rating <= 5 ? rating : null,
      client_comments: String(formData.get("client_comments") ?? "").trim() || null,
      closeout_pdf_url: `/projects/${projectId}/closeout/pdf`,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );

  if (closeErr) {
    if (closeErr.code === "42501") return { error: "Management access required." };
    return { error: "Could not complete closeout." };
  }

  const { error: projErr } = await supabase
    .from("project")
    .update({ status: "completed" })
    .eq("id", projectId);

  if (projErr) return { error: "Closeout saved, but could not mark project completed." };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/closeout`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true };
}
