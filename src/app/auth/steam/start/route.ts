import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { steamLoginUrl } from "@/lib/steam";
import { createClient } from "@/lib/supabase/server";
import {
  STEAM_STATE_COOKIE,
  STEAM_STATE_COOKIE_PATH,
  steamCallbackUrl,
} from "../steam-state";

// GET /auth/steam/start: sends the logged-in user to Steam's sign-in page.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login");

  const origin = request.nextUrl.origin;
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(STEAM_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: STEAM_STATE_COOKIE_PATH,
    maxAge: 60 * 10,
  });

  redirect(steamLoginUrl(steamCallbackUrl(origin, state), origin));
}
