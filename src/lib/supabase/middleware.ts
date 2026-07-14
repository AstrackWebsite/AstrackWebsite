import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and gates access:
 * unauthenticated users are redirected to /login (except public routes).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Routes reachable without a session.
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Role decides the experience: office runs the full app; a site supervisor
    // is confined to their jobs + the compliance assistant.
    const { data: prof } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", user.id)
      .maybeSingle();
    const office = prof?.app_role === "admin" || prof?.app_role === "management";
    const home = office ? "/dashboard" : "/projects";

    // Signed-in users shouldn't sit on the auth pages.
    if (pathname === "/login" || pathname === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    // Keep site supervisors within the on-site surface.
    if (!office && !isPublic) {
      const siteAllowed =
        pathname.startsWith("/projects") ||
        pathname.startsWith("/assistant") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/pending");
      if (!siteAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/projects";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
