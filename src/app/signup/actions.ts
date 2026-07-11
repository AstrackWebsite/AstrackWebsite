"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Request access: creates the auth user with company metadata. A database
 * trigger provisions a PENDING company + admin profile. The platform owner
 * approves it before the user can use the app.
 */
export async function requestAccess(_prev: unknown, formData: FormData) {
  const companyName = String(formData.get("company_name") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!companyName) return { error: "Enter your company name." };
  if (!contactName) return { error: "Enter your name." };
  if (!email) return { error: "Enter your email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName, contact_name: contactName },
    },
  });

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return { error: "An account with that email already exists — try logging in." };
    }
    return { error: "Could not submit your request. Please try again." };
  }

  return { ok: true };
}
