import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Refreshes the auth session before the page renders and writes the
// updated cookies to both the request (for this render) and the response
// (for the browser).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // No-cache headers, so a CDN never serves one user's session to another.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Must run before anything else: triggers the token refresh if needed.
  const { data } = await supabase.auth.getClaims();

  // The backlog is the app's main screen: logged-in users opening "/" go
  // straight there (visitors still see the landing page with "Entrar").
  if (data?.claims.sub && request.nextUrl.pathname === "/") {
    const redirect = NextResponse.redirect(new URL("/backlog", request.url));
    // Carry over refreshed session cookies and the no-cache headers set by
    // Supabase (not every header: NextResponse.next() also carries internal
    // Next.js headers that would turn the redirect into a "continue").
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const key of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(key);
      if (value) redirect.headers.set(key, value);
    }
    return redirect;
  }

  return response;
}
