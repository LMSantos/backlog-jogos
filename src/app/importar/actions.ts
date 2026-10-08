"use server";

import { findRawgGameForSteam, getGame } from "@/lib/rawg";
import { revalidateBacklogPages } from "@/lib/revalidate";
import { getOwnedGames, type SteamOwnedGame } from "@/lib/steam";
import { createClient } from "@/lib/supabase/server";
import { MAX_IMPORT } from "./limits";

type ImportedGame = { appId: number; title: string };

export type ImportResult =
  | {
      ok: true;
      // Linked through the Steam app id listed on RAWG: certain.
      imported: ImportedGame[];
      // Linked by name only: the user should double-check these.
      byName: ImportedGame[];
      // Already in the backlog: Steam id and playtime were updated.
      updated: ImportedGame[];
      notFound: ImportedGame[];
      // RAWG was down or timed out: trying again later usually works.
      rawgFailed: ImportedGame[];
      // The database refused the row: needs a look at the server logs.
      saveFailed: ImportedGame[];
    }
  | { ok: false; error: string };

// Runs `task` over `items` with at most `limit` running at the same time,
// to stay friendly with the RAWG API.
async function forEachLimited<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        await task(item);
      }
    }),
  );
}

export async function importSteamGames(
  appIds: number[],
): Promise<ImportResult> {
  const valid =
    Array.isArray(appIds) &&
    appIds.length > 0 &&
    appIds.length <= MAX_IMPORT &&
    appIds.every((id) => Number.isInteger(id) && id > 0);
  if (!valid) {
    return { ok: false, error: `Escolha de 1 a ${MAX_IMPORT} jogos.` };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return { ok: false, error: "Sua sessão expirou. Entre de novo." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("steam_id")
    .eq("id", userId)
    .maybeSingle<{ steam_id: string | null }>();
  if (!profile?.steam_id) {
    return { ok: false, error: "Vincule sua conta Steam primeiro." };
  }

  // Only games the user really owns: the list comes from Steam, never
  // from the browser.
  let owned: SteamOwnedGame[] | null;
  try {
    owned = await getOwnedGames(profile.steam_id);
  } catch {
    return { ok: false, error: "A Steam não respondeu. Tente de novo." };
  }
  if (!owned) {
    return { ok: false, error: "Sua biblioteca Steam está privada." };
  }
  const ownedById = new Map(owned.map((game) => [game.appId, game]));
  const selected = [...new Set(appIds)]
    .map((id) => ownedById.get(id))
    .filter((game): game is SteamOwnedGame => game !== undefined);

  const result = {
    imported: [] as ImportedGame[],
    byName: [] as ImportedGame[],
    updated: [] as ImportedGame[],
    notFound: [] as ImportedGame[],
    rawgFailed: [] as ImportedGame[],
    saveFailed: [] as ImportedGame[],
  };

  await forEachLimited(selected, 4, async (steamGame) => {
    const entry = { appId: steamGame.appId, title: steamGame.name };

    let match;
    let game;
    try {
      match = await findRawgGameForSteam(steamGame.appId, steamGame.name);
      game = match && (await getGame(match.rawgId));
    } catch {
      result.rawgFailed.push(entry);
      return;
    }
    if (!match || !game) {
      result.notFound.push(entry);
      return;
    }

    const steamFields = {
      steam_app_id: steamGame.appId,
      steam_playtime_minutes: steamGame.playtimeMinutes,
    };
    const { error } = await supabase.from("backlog_items").insert({
      user_id: userId,
      rawg_id: game.rawgId,
      title: game.title,
      cover_url: game.coverUrl,
      platforms: game.platforms,
      genres: game.genres,
      release_year: game.releaseYear,
      avg_playtime_hours: game.avgPlaytimeHours,
      ...steamFields,
    });

    // 23505 = already in the backlog (added by search): keep the user's
    // status/priority, just attach the Steam data.
    if (error?.code === "23505") {
      const { error: updateError } = await supabase
        .from("backlog_items")
        .update(steamFields)
        .eq("user_id", userId)
        .eq("rawg_id", game.rawgId);
      if (updateError) {
        console.error("Steam import: update failed", steamGame.appId, updateError);
        result.saveFailed.push(entry);
      } else {
        result.updated.push({ ...entry, title: game.title });
      }
      return;
    }
    if (error) {
      console.error("Steam import: insert failed", steamGame.appId, error);
      result.saveFailed.push(entry);
      return;
    }

    const target =
      match.confidence === "steam" ? result.imported : result.byName;
    target.push({ ...entry, title: game.title });
  });

  revalidateBacklogPages();
  return { ok: true, ...result };
}
