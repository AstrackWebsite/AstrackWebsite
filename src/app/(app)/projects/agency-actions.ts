"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyContext } from "@/lib/data";
import { notifyOffice } from "@/lib/notify";
import type { StaffRole } from "@/lib/types";

const ROLES: StaffRole[] = [
  "contracts_manager",
  "site_manager",
  "site_supervisor",
  "operative",
];

/**
 * Add an agency / off-the-books worker on site and assign them to the project,
 * so the supervisor can then sign them onto the register. Available to any
 * company member (supervisors included). Captures their tickets so cert-
 * blocking still applies.
 */
export async function addAgencyStaff(projectId: string, formData: FormData) {
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company) return { error: "Please sign in again." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter the worker's name." };
  const roleRaw = String(formData.get("role") ?? "operative");
  const role: StaffRole = ROLES.includes(roleRaw as StaffRole)
    ? (roleRaw as StaffRole)
    : "operative";

  const dateOrNull = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };

  const supabase = createClient();
  const { data: created, error } = await supabase
    .from("staff")
    .insert({
      name,
      role,
      is_agency: true,
      contact: String(formData.get("contact") ?? "").trim() || null,
      asbestos_training_expiry: dateOrNull("asbestos_training_expiry"),
      medical_expiry: dateOrNull("medical_expiry"),
      face_fit_expiry: dateOrNull("face_fit_expiry"),
      mask_service_expiry: dateOrNull("mask_service_expiry"),
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.code === "42501") return { error: "You don't have permission to add workers." };
    return { error: `Could not add the worker: ${error?.message ?? "unknown error"}` };
  }

  const { error: linkErr } = await supabase
    .from("project_staff")
    .insert({ project_id: projectId, staff_id: created.id });
  if (linkErr && !/duplicate|unique/i.test(linkErr.message)) {
    return { error: `Worker added, but couldn't assign to the project: ${linkErr.message}` };
  }

  await notifyOffice({ projectId, kind: "agency", message: `added agency worker ${name}` });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
