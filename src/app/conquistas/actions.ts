"use server";

import { syncAchievementProgress } from "@/lib/achievements";
import { revalidateBacklogPages } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

export type SyncResult =
  | { ok: true; synced: number; failed: number }
  | { ok: false; error: string; privacyHelp?: boolean };

// "Atualizar conquistas": refreshes the snapshot for every Steam game in the
// user's backlog.
export async function syncMyAchievements(): Promise<SyncResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return { ok: false, error: "Sua sessão expirou. Entre de novo." };

  const [{ data: profile }, { data: items }] = await Promise.all([
    supabase
      .from("profiles")
      .select("steam_id")
      .eq("id", userId)
      .maybeSingle<{ steam_id: string | null }>(),
    supabase
      .from("backlog_items")
      .select("steam_app_id")
      .eq("user_id", userId)
      .not("steam_app_id", "is", null),
  ]);
  if (!profile?.steam_id) {
    return { ok: false, error: "Vincule sua conta Steam primeiro." };
  }

  const appIds = [
    ...new Set((items ?? []).map((row) => row.steam_app_id as number)),
  ];
  if (appIds.length === 0) {
    return {
      ok: false,
      error: "Nenhum jogo da Steam no backlog. Importe sua biblioteca primeiro.",
    };
  }

  let summary;
  try {
    summary = await syncAchievementProgress(userId, profile.steam_id, appIds);
  } catch (error) {
    console.error("Achievements sync: save failed", String(error));
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }

  if (summary.private) {
    return {
      ok: false,
      error: "A Steam não mostra suas conquistas porque o perfil está privado.",
      privacyHelp: true,
    };
  }

  revalidateBacklogPages();
  return { ok: true, synced: summary.synced, failed: summary.failed };
}
