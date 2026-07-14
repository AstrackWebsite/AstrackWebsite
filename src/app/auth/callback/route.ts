import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Landing point for links in Supabase auth emails (password reset). Exchanges
 * the one-time code for a session, then forwards to the follow-up page (e.g.
 * /reset-password) so the user can set a new password.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?reset=expired", url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
