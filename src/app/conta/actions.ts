"use server";

import { redirect } from "next/navigation";
import { revalidateBacklogPages, revalidateProfilePages } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Unlinking removes everything that came from Steam: achievement snapshots,
// the Steam app id and playtime on backlog games, and the SteamID itself.
// The games stay in the backlog (status, priority, rating are the user's).
export async function unlinkSteam() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  // Same rule as linking: only the server writes Steam data. The SteamID
  // goes last, so a failure halfway can simply be retried.
  const admin = createAdminClient();
  const steps = [
    () =>
      admin.from("steam_achievement_progress").delete().eq("user_id", userId),
    () =>
      admin
        .from("backlog_items")
        .update({ steam_app_id: null, steam_playtime_minutes: null })
        .eq("user_id", userId),
    () => admin.from("profiles").update({ steam_id: null }).eq("id", userId),
  ];

  let failed = false;
  for (const step of steps) {
    const { error } = await step();
    if (error) {
      console.error("Unlink Steam failed:", error.code, error.message);
      failed = true;
      break;
    }
  }

  revalidateProfilePages();
  revalidateBacklogPages();
  redirect(failed ? "/conta?steam=erro-desvincular" : "/conta?steam=desvinculada");
}
