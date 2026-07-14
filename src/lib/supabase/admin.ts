import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS, so it must NEVER be imported into
// client code or exposed to the browser. Used only for privileged operations
// like creating supervisor logins. Requires SUPABASE_SERVICE_ROLE_KEY (secret).

export const ADMIN_ENABLED = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Admin actions need SUPABASE_SERVICE_ROLE_KEY to be set.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
