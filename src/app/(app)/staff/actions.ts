"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAFF_FORM_CONFIG, STAFF_FIELDS } from "@/lib/staffForm";
import type { StaffRole } from "@/lib/types";

const ROLES: StaffRole[] = [
  "contracts_manager",
  "site_manager",
  "site_supervisor",
  "operative",
];

export async function createStaff(_prev: unknown, formData: FormData) {
  const role = String(formData.get("role") ?? "") as StaffRole;
  const name = String(formData.get("name") ?? "").trim();

  if (!ROLES.includes(role)) return { error: "Choose a staff position." };
  if (!name) return { error: "Name is required." };

  const cfg = STAFF_FORM_CONFIG[role];
  const record: Record<string, string | number | null> = { name, role };

  // Collect the fields relevant to this role.
  for (const col of [...cfg.mandatory, ...cfg.optional]) {
    const raw = String(formData.get(col) ?? "").trim();
    const isMandatory = cfg.mandatory.includes(col);

    if (!raw) {
      if (isMandatory) {
        return { error: `${STAFF_FIELDS[col].label} is required for this role.` };
      }
      continue;
    }
    record[col] = STAFF_FIELDS[col].type === "number" ? Number(raw) : raw;
  }

  const supabase = createClient();
  const { error } = await supabase.from("staff").insert(record);

  if (error) {
    // RLS: only management/admin may add staff.
    if (error.code === "42501" || /policy/i.test(error.message)) {
      return { error: "You don't have permission to add staff." };
    }
    return { error: "Could not save staff member. Please try again." };
  }

  revalidatePath("/staff");
  revalidatePath("/");
  redirect("/staff");
}
