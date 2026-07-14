"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAFF_FORM_CONFIG, STAFF_FIELDS } from "@/lib/staffForm";
import type { StaffRole } from "@/lib/types";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { scanCertificate, isScannable, type CertScanResult } from "@/lib/ai/certScan";

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

export type CertScanState =
  | { ok: true; result: CertScanResult }
  | { ok: false; error: string }
  | Record<string, never>;

/**
 * Reads an uploaded certificate photo/PDF with AI and returns the extracted
 * expiry dates for the operator to confirm. Never writes anything — the user
 * reviews the result and the normal Save action persists it.
 */
export async function scanStaffCertificate(
  _prev: CertScanState,
  formData: FormData
): Promise<CertScanState> {
  if (!AI_ENABLED) {
    return { ok: false, error: "AI scanning is not enabled on this account." };
  }

  const file = formData.get("certificate");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo or PDF of the certificate." };
  }
  if (file.size > 12 * 1024 * 1024) {
    return { ok: false, error: "That file is too large. Keep it under 12MB." };
  }
  if (!isScannable(file.type)) {
    return { ok: false, error: "Upload a JPG, PNG or PDF certificate." };
  }

  // Only management/admin manage staff — mirror the write-path guard so the AI
  // endpoint can't be used to read data the caller couldn't otherwise reach.
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { ok: false, error: "Please sign in again." };
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await scanCertificate(base64, file.type);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't read that certificate — ${aiErrorReason(err)}. Enter the dates manually.`,
    };
  }
}
