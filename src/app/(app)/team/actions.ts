"use server";

import { revalidatePath } from "next/cache";
import { getMyContext } from "@/lib/data";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { isOfficeRole } from "@/lib/types";

export type CreateSupervisorState =
  | { ok: true; email: string }
  | { error: string }
  | Record<string, never>;

/**
 * Office creates a site-supervisor login for their company. Uses the service
 * role to create the auth user; the signup trigger reads the company_id/role in
 * the user metadata and attaches the new profile to this company as `site`.
 */
export async function createSupervisor(
  _prev: CreateSupervisorState,
  formData: FormData
): Promise<CreateSupervisorState> {
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company || !isOfficeRole(ctx.profile?.app_role)) {
    return { error: "Office access required." };
  }
  if (!ADMIN_ENABLED) {
    return { error: "Set SUPABASE_SERVICE_ROLE_KEY to create logins." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const staffId = String(formData.get("staff_id") ?? "").trim() || null;

  if (!email || !/.+@.+\..+/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };

  try {
    const admin = createAdminClient();

    // Record a server-side invite FIRST. The signup trigger only attaches the
    // new login to this company when it finds this invite — the browser can't
    // influence which company an account joins, closing the tenant-crossover gap.
    const { error: invErr } = await admin.from("company_invite").insert({
      company_id: ctx.company.id,
      email,
      app_role: "site",
      staff_id: staffId,
    });
    if (invErr) {
      return { error: "Could not prepare the invite. Please try again." };
    }

    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name || null },
    });
    if (error) {
      // Roll back the unused invite so it can't be consumed by a later signup.
      await admin
        .from("company_invite")
        .delete()
        .eq("company_id", ctx.company.id)
        .eq("email", email)
        .is("used_at", null);
      if (/already|exists|registered|duplicate/i.test(error.message)) {
        return { error: "That email already has an account." };
      }
      return { error: "Could not create the login. Please try again." };
    }
  } catch {
    return { error: "Could not create the login. Please try again." };
  }

  revalidatePath("/team");
  return { ok: true, email };
}
