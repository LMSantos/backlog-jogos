"use server";

import { getGame } from "@/lib/rawg";
import { createClient } from "@/lib/supabase/server";

export type AddToBacklogResult = { ok: true } | { ok: false; error: string };

// Receives only the RAWG id: the game data is fetched again on the server,
// so the client can't save a made-up title or cover.
export async function addToBacklog(
  rawgId: number,
): Promise<AddToBacklogResult> {
  if (!Number.isInteger(rawgId) || rawgId <= 0) {
    return { ok: false, error: "Jogo inválido." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) {
    return { ok: false, error: "Sua sessão expirou. Entre de novo." };
  }

  let game;
  try {
    game = await getGame(rawgId);
  } catch {
    // RAWG down or timed out (see rawgFetch).
    return {
      ok: false,
      error: "A RAWG está instável agora. Tente de novo em instantes.",
    };
  }
  if (!game) {
    return { ok: false, error: "Jogo não encontrado na RAWG." };
  }

  // status ('backlog') and priority (2 = média) come from the table defaults.
  const { error } = await supabase.from("backlog_items").insert({
    user_id: userId,
    rawg_id: game.rawgId,
    title: game.title,
    cover_url: game.coverUrl,
    platforms: game.platforms,
    genres: game.genres,
    release_year: game.releaseYear,
    avg_playtime_hours: game.avgPlaytimeHours,
  });

  if (error) {
    // 23505 = unique (user_id, rawg_id): already in the backlog, so it's fine.
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: "Não foi possível adicionar. Tente de novo." };
  }
  return { ok: true };
}
