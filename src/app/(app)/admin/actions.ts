"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CompanyStatus } from "@/lib/types";

/** Approve / suspend / re-activate a company (platform admin only — RLS enforces). */
export async function setCompanyStatus(companyId: string, status: CompanyStatus) {
  const supabase = createClient();
  const { error } = await supabase
    .from("company")
    .update({ status })
    .eq("id", companyId);

  if (error) return { error: "Could not update the company." };
  revalidatePath("/admin");
  return { ok: true };
}
