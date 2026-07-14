"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { staffBlockReason } from "@/lib/compliance";
import { todayISO } from "@/lib/format";
import type { ProjectClassification, Staff } from "@/lib/types";

const CLASSIFICATIONS: ProjectClassification[] = ["licensed", "nnlw", "general"];

function permissionError(error: { code?: string; message: string }): boolean {
  return error.code === "42501" || /policy|permission/i.test(error.message);
}

export async function createProject(_prev: unknown, formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const reference = get("reference");
  const address = get("address");
  const classification = get("classification") as ProjectClassification;
  const start_date = get("start_date");
  const end_date = get("end_date");
  const contracts_manager_id = get("contracts_manager_id");
  const supervisor_id = get("supervisor_id");
  const clientName = get("client_name");

  if (!reference) return { error: "Project reference is required." };
  if (!address) return { error: "Project address is required." };
  if (!CLASSIFICATIONS.includes(classification))
    return { error: "Choose a project type." };
  if (!start_date) return { error: "Start date is required." };
  if (!contracts_manager_id) return { error: "Choose a contracts manager." };
  if (!supervisor_id) return { error: "Choose a supervisor." };
  if (!clientName) return { error: "Client name is required." };

  // ASB5 notification date is recorded for licensed work but never blocks
  // creating the project — it can be entered later once notified.
  let asb5_notification_date: string | null = null;
  if (classification === "licensed") {
    asb5_notification_date = get("asb5_notification_date") || null;
  }

  const contractRaw = get("contract_value");
  const maxOpsRaw = get("max_operatives");

  const supabase = createClient();

  // Create the client record first, then the project referencing it.
  const { data: client, error: clientErr } = await supabase
    .from("client")
    .insert({
      name: clientName,
      contact: get("client_contact") || null,
      address: get("client_address") || null,
      email: get("client_email") || null,
    })
    .select()
    .single();

  if (clientErr) {
    if (permissionError(clientErr))
      return { error: "You don't have permission to create projects." };
    return { error: "Could not save the client. Please try again." };
  }

  const { error: projErr } = await supabase.from("project").insert({
    reference,
    address,
    classification,
    status: "setup",
    start_date,
    end_date: end_date || null,
    max_operatives: maxOpsRaw ? Number(maxOpsRaw) : null,
    contracts_manager_id,
    supervisor_id,
    client_id: client.id,
    asb5_notification_date,
    rams_document_url: get("rams_document_url") || null,
    contract_value: contractRaw ? Number(contractRaw) : null,
  });

  if (projErr) {
    if (permissionError(projErr))
      return { error: "You don't have permission to create projects." };
    if (/unique|duplicate/i.test(projErr.message))
      return { error: "That project reference is already in use." };
    return { error: "Could not save the project. Please try again." };
  }

  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}

/**
 * Update an existing project (and its client record). Office only — RLS
 * enforces management. Mirrors createProject's validation so the same rules
 * apply when a detail is corrected after setup.
 */
export async function updateProject(
  projectId: string,
  clientId: string | null,
  _prev: unknown,
  formData: FormData
) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const reference = get("reference");
  const address = get("address");
  const classification = get("classification") as ProjectClassification;
  const start_date = get("start_date");
  const end_date = get("end_date");
  const contracts_manager_id = get("contracts_manager_id");
  const supervisor_id = get("supervisor_id");
  const clientName = get("client_name");

  if (!reference) return { error: "Project reference is required." };
  if (!address) return { error: "Project address is required." };
  if (!CLASSIFICATIONS.includes(classification))
    return { error: "Choose a project type." };
  if (!start_date) return { error: "Start date is required." };
  if (!contracts_manager_id) return { error: "Choose a contracts manager." };
  if (!supervisor_id) return { error: "Choose a supervisor." };
  if (!clientName) return { error: "Client name is required." };

  let asb5_notification_date: string | null = null;
  if (classification === "licensed") {
    asb5_notification_date = get("asb5_notification_date") || null;
  }

  const contractRaw = get("contract_value");
  const maxOpsRaw = get("max_operatives");

  const supabase = createClient();

  // Keep the client record in step with the form.
  const clientFields = {
    name: clientName,
    contact: get("client_contact") || null,
    address: get("client_address") || null,
    email: get("client_email") || null,
  };
  let ensuredClientId = clientId;
  if (clientId) {
    const { error: clientErr } = await supabase
      .from("client")
      .update(clientFields)
      .eq("id", clientId);
    if (clientErr) {
      if (permissionError(clientErr))
        return { error: "You don't have permission to edit this project." };
      return { error: "Could not update the client. Please try again." };
    }
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from("client")
      .insert(clientFields)
      .select()
      .single();
    if (clientErr) {
      if (permissionError(clientErr))
        return { error: "You don't have permission to edit this project." };
      return { error: "Could not save the client. Please try again." };
    }
    ensuredClientId = newClient.id;
  }

  const { error: projErr } = await supabase
    .from("project")
    .update({
      reference,
      address,
      classification,
      start_date,
      end_date: end_date || null,
      max_operatives: maxOpsRaw ? Number(maxOpsRaw) : null,
      contracts_manager_id,
      supervisor_id,
      client_id: ensuredClientId,
      asb5_notification_date,
      rams_document_url: get("rams_document_url") || null,
      contract_value: contractRaw ? Number(contractRaw) : null,
    })
    .eq("id", projectId);

  if (projErr) {
    if (permissionError(projErr))
      return { error: "You don't have permission to edit this project." };
    if (/unique|duplicate/i.test(projErr.message))
      return { error: "That project reference is already in use." };
    return { error: "Could not update the project. Please try again." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

/**
 * Sign a staff member into today's site register.
 * Rule 1: expired medical / face-fit / mask blocks sign-in — we record a
 * BLOCKED entry with the reason instead of a check-in.
 */
export interface SignInChecks {
  checklist?: { label: string; checked: boolean }[];
  rpe?: string | null;
}

export async function signInStaff(
  projectId: string,
  staffId: string,
  checks: SignInChecks = {}
) {
  const supabase = createClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("id", staffId)
    .single();
  if (!staff) return { error: "Staff member not found." };

  const reason = staffBlockReason(staff as Staff);
  const today = todayISO();

  const row: {
    project_id: string;
    staff_id: string;
    entry_date: string;
    blocked?: boolean;
    block_reason?: string;
    check_in?: string;
    checklist?: { label: string; checked: boolean }[] | null;
    rpe?: string | null;
  } = reason
    ? {
        project_id: projectId,
        staff_id: staffId,
        entry_date: today,
        blocked: true,
        block_reason: reason,
      }
    : {
        project_id: projectId,
        staff_id: staffId,
        entry_date: today,
        check_in: new Date().toISOString(),
        checklist: checks.checklist ?? null,
        rpe: checks.rpe || null,
      };

  // For a clear-to-work sign-in, the supervisor's mandatory checks must be done.
  if (!reason) {
    const list = checks.checklist ?? [];
    if (list.length === 0 || !list.every((c) => c.checked)) {
      return { error: "Complete all pre-sign-in checks first." };
    }
    if (!checks.rpe) return { error: "Record the RPE worn." };
  }

  const { error } = await supabase.from("site_register_entry").insert(row);
  if (error) return { error: "Could not sign in. Please try again." };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Sign a staff member out (record check-out). */
export async function signOutEntry(entryId: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("site_register_entry")
    .update({ check_out: new Date().toISOString() })
    .eq("id", entryId);
  if (error) return { error: "Could not sign out. Please try again." };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
