import type { NextRequest } from "next/server";
import type { SearchResult } from "@/lib/games";
import { searchGames } from "@/lib/rawg";
import { createClient } from "@/lib/supabase/server";

// GET /api/games/search?q=zelda
// Runs on the server so RAWG_API_KEY never reaches the browser.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return Response.json({ results: [] });
  }

  // Only logged-in users can search, so strangers can't burn our RAWG quota.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let games;
  try {
    // Lowercase so "Zelda" and "zelda" share the same cache entry.
    games = await searchGames(query.toLowerCase());
  } catch {
    return Response.json({ error: "rawg_unavailable" }, { status: 502 });
  }

  // Mark the games that are already in this user's backlog.
  const ids = games.map((game) => game.rawgId);
  const { data: owned } = ids.length
    ? await supabase
        .from("backlog_items")
        .select("rawg_id")
        .eq("user_id", userId)
        .in("rawg_id", ids)
    : { data: [] };
  const ownedIds = new Set(owned?.map((row) => row.rawg_id));

  const results: SearchResult[] = games.map((game) => ({
    ...game,
    inBacklog: ownedIds.has(game.rawgId),
  }));
  return Response.json({ results });
}
