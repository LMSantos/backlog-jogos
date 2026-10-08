import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { revalidateProfilePages } from "@/lib/revalidate";
import { verifySteamLogin } from "@/lib/steam";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  STEAM_STATE_COOKIE,
  STEAM_STATE_COOKIE_PATH,
  steamCallbackUrl,
} from "../steam-state";

// GET /auth/steam/callback: Steam sends the user back here after sign-in.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STEAM_STATE_COOKIE)?.value;
  cookieStore.delete({ name: STEAM_STATE_COOKIE, path: STEAM_STATE_COOKIE_PATH });
  if (!state || state !== expectedState) redirect("/conta?steam=erro");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const steamId = await verifySteamLogin(
    params,
    steamCallbackUrl(request.nextUrl.origin, state),
  );
  if (!steamId) redirect("/conta?steam=erro");

  // Browsers can't write steam_id (column grants), so the server does it
  // with the secret key, and only for the logged-in user's own row.
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ steam_id: steamId })
    .eq("id", userId);

  if (error) {
    // 23505 = unique: this Steam account is linked to someone else.
    redirect(error.code === "23505" ? "/conta?steam=em-uso" : "/conta?steam=erro");
  }

  revalidateProfilePages();
  redirect("/conta?steam=vinculada");
}
