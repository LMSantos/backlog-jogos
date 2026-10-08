import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Create a new one per request: it reads the session from that request's cookies.
export async function createClient() {
  const cookieStore = await cookies();
  // Supabase reads Date.now() to check token expiry. io() tells Next.js
  // that this is request-time work, so it is kept out of the prerender.
  await io();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can't set cookies. Safe to ignore:
          // the proxy refreshes the session on every request.
        }
      },
    },
  });
}
