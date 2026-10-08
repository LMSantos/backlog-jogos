"use server";

import { redirect } from "next/navigation";
import { revalidateProfilePages } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function unlinkSteam() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  // Same rule as linking: only the server writes steam_id.
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ steam_id: null })
    .eq("id", userId);

  revalidateProfilePages();
  redirect(error ? "/conta?steam=erro" : "/conta?steam=desvinculada");
}
