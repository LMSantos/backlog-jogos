import "server-only";
import { forEachLimited } from "./concurrency";
import { getPlayerAchievements, type PlayerAchievementsResult } from "./steam";
import { createAdminClient } from "./supabase/admin";

export type ProgressRow = {
  user_id: string;
  steam_app_id: number;
  unlocked: number;
  total: number;
  synced_at: string;
};

export function progressRow(
  userId: string,
  appId: number,
  result: PlayerAchievementsResult,
): ProgressRow | null {
  if (result.status === "private") return null;
  const achievements = result.status === "ok" ? result.achievements : [];
  return {
    user_id: userId,
    steam_app_id: appId,
    unlocked: achievements.filter((item) => item.achieved).length,
    total: achievements.length,
    synced_at: new Date().toISOString(),
  };
}

// Writes progress snapshots. Browsers can't write this table (no RLS write
// policies), so this uses the secret key, always with data read from Steam.
export async function saveProgress(rows: ProgressRow[]) {
  if (rows.length === 0) return;
  const { error } = await createAdminClient()
    .from("steam_achievement_progress")
    .upsert(rows, { onConflict: "user_id,steam_app_id" });
  // Supabase errors are plain objects that log as {}: wrap them so the
  // code and message show up in the server logs.
  if (error) {
    throw new Error(
      `steam_achievement_progress upsert failed: ${error.code} ${error.message}`,
    );
  }
}

export type SyncSummary = {
  synced: number;
  private: boolean;
  failed: number;
};

// Reads Steam for every given game and saves the snapshots.
export async function syncAchievementProgress(
  userId: string,
  steamId: string,
  appIds: number[],
): Promise<SyncSummary> {
  const rows: ProgressRow[] = [];
  let isPrivate = false;
  let failed = 0;

  await forEachLimited(appIds, 4, async (appId) => {
    if (isPrivate) return;
    try {
      const result = await getPlayerAchievements(steamId, appId);
      if (result.status === "private") {
        isPrivate = true;
        return;
      }
      const row = progressRow(userId, appId, result);
      if (row) rows.push(row);
    } catch {
      failed++;
    }
  });

  await saveProgress(rows);
  return { synced: rows.length, private: isPrivate, failed };
}
