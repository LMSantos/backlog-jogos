import "server-only";
import { cacheLife } from "next/cache";
import type { Game } from "./games";

// Server-only: reads RAWG_API_KEY. Never import this from a Client Component.
const API_URL = "https://api.rawg.io/api";

type RawgGame = {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  playtime: number | null;
  platforms: { platform: { name: string } }[] | null;
  genres: { name: string }[] | null;
};

export class RawgUnavailableError extends Error {}

function apiKey() {
  const key = process.env.RAWG_API_KEY;
  if (!key) {
    throw new Error("Missing RAWG_API_KEY. Add it to .env.local.");
  }
  return key;
}

// RAWG sometimes answers 502/503. Retry once before giving up.
async function rawgFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${API_URL}${path}`);
  url.search = new URLSearchParams({ ...params, key: apiKey() }).toString();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
      if (response.status < 500) return response;
    } catch {
      // Network error or timeout: try again.
    }
  }
  throw new RawgUnavailableError(`RAWG unavailable: ${path}`);
}

// RAWG covers are large (up to ~500 KB). Its media server can resize them:
// /media/... -> /media/resize/420/-/... (about 20 KB, enough for phones).
function resizeCover(url: string | null) {
  if (!url?.startsWith("https://media.rawg.io/media/")) return url;
  return url.replace("/media/", "/media/resize/420/-/");
}

function toGame(raw: RawgGame): Game {
  return {
    rawgId: raw.id,
    title: raw.name,
    coverUrl: resizeCover(raw.background_image),
    platforms: raw.platforms?.map((p) => p.platform.name) ?? [],
    genres: raw.genres?.map((g) => g.name) ?? [],
    releaseYear: raw.released ? Number(raw.released.slice(0, 4)) : null,
    // RAWG reports 0 when nobody has logged a playtime: treat it as unknown.
    avgPlaytimeHours: raw.playtime ? raw.playtime : null,
  };
}

// Cached for a day per query: repeated searches cost no RAWG quota.
// Errors are thrown, not returned, so a RAWG outage is never cached.
export async function searchGames(query: string): Promise<Game[]> {
  "use cache";
  cacheLife("days");

  const response = await rawgFetch("/games", {
    search: query,
    search_precise: "true",
    page_size: "20",
  });
  if (!response.ok) throw new RawgUnavailableError(`RAWG ${response.status}`);

  const data = (await response.json()) as { results: RawgGame[] };
  return data.results.map(toGame);
}

export async function getGame(rawgId: number): Promise<Game | null> {
  "use cache";
  cacheLife("weeks");

  const response = await rawgFetch(`/games/${rawgId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new RawgUnavailableError(`RAWG ${response.status}`);

  return toGame((await response.json()) as RawgGame);
}

export type SteamMatch = {
  rawgId: number;
  // "steam": RAWG lists this exact Steam app id for the game (certain).
  // "name": only the name matched; the user should double-check it.
  confidence: "steam" | "name";
};

// Steam names often carry symbols RAWG doesn't use ("ELDEN RING™").
function cleanSteamName(name: string) {
  return name
    .replace(/[™®©]/g, "")
    .replace(/[–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(name: string) {
  return cleanSteamName(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function listsSteamApp(rawgId: number, steamAppId: number) {
  const response = await rawgFetch(`/games/${rawgId}/stores`);
  if (!response.ok) return false;
  const data = (await response.json()) as {
    results: { store_id: number; url: string }[];
  };
  const appUrl = new RegExp(`/app/${steamAppId}(/|$)`);
  // store_id 1 = Steam.
  return data.results.some((store) => store.store_id === 1 && appUrl.test(store.url));
}

// Finds the RAWG game for a Steam app. Cached for a day and shared by
// everyone, so friends who own the same game cost no extra RAWG calls.
export async function findRawgGameForSteam(
  steamAppId: number,
  steamName: string,
): Promise<SteamMatch | null> {
  "use cache";
  cacheLife("days");

  const query = cleanSteamName(steamName);

  // 1) Search Steam games only and confirm by the Steam app id.
  const steamSearch = await rawgFetch("/games", {
    search: query,
    stores: "1",
    page_size: "5",
  });
  if (!steamSearch.ok) throw new RawgUnavailableError(`RAWG ${steamSearch.status}`);
  const { results: candidates } = (await steamSearch.json()) as {
    results: { id: number }[];
  };
  const confirmed = await Promise.all(
    candidates.slice(0, 3).map((game) => listsSteamApp(game.id, steamAppId)),
  );
  const index = confirmed.indexOf(true);
  if (index !== -1) return { rawgId: candidates[index].id, confidence: "steam" };

  // 2) New or re-released games often lack the Steam link on RAWG:
  //    accept an exact name match, flagged for the user to check.
  const anySearch = await rawgFetch("/games", { search: query, page_size: "5" });
  if (!anySearch.ok) throw new RawgUnavailableError(`RAWG ${anySearch.status}`);
  const { results } = (await anySearch.json()) as {
    results: { id: number; name: string }[];
  };
  const wanted = normalizeName(steamName);
  const sameName = results.find((game) => normalizeName(game.name) === wanted);
  return sameName ? { rawgId: sameName.id, confidence: "name" } : null;
}
