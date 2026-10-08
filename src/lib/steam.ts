import "server-only";
import { cacheLife } from "next/cache";
import type { SteamOwnedGame } from "./steam-types";

export type { SteamOwnedGame };

// Steam sign-in uses OpenID 2.0. Steam proves who the user is; we never see
// their password. https://steamcommunity.com/dev
const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const OPENID_NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID_PATTERN = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export function steamLoginUrl(returnTo: string, realm: string) {
  const url = new URL(OPENID_ENDPOINT);
  url.search = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  }).toString();
  return url.toString();
}

// Checks the response Steam sent back to our callback and returns the
// SteamID64, or null if anything doesn't match. The final check asks Steam
// itself to confirm the signature (check_authentication).
export async function verifySteamLogin(
  params: URLSearchParams,
  expectedReturnTo: string,
): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") return null;
  if (params.get("openid.op_endpoint") !== OPENID_ENDPOINT) return null;
  // Must be a response to a login started by us, for this exact callback.
  if (params.get("openid.return_to") !== expectedReturnTo) return null;

  const match = params.get("openid.claimed_id")?.match(CLAIMED_ID_PATTERN);
  if (!match) return null;

  const body = new URLSearchParams();
  for (const [key, value] of params) {
    if (key.startsWith("openid.")) body.set(key, value);
  }
  body.set("openid.mode", "check_authentication");

  try {
    const response = await fetch(OPENID_ENDPOINT, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const text = await response.text();
    return /^is_valid:true$/m.test(text) ? match[1] : null;
  } catch {
    return null;
  }
}

function apiKey() {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("Missing STEAM_API_KEY. Add it to .env.local.");
  return key;
}

export type SteamPlayer = {
  steamId: string;
  personaName: string;
  avatarUrl: string | null;
  profileUrl: string;
  // Profile visibility. Achievements also need "Game details" set to public,
  // which this API can't tell; the achievements calls will.
  isPublic: boolean;
};

type RawPlayer = {
  steamid: string;
  personaname: string;
  avatarmedium?: string;
  profileurl: string;
  communityvisibilitystate: number;
};

// Cached for an hour: names and avatars rarely change.
export async function getSteamPlayer(
  steamId: string,
): Promise<SteamPlayer | null> {
  "use cache";
  cacheLife("hours");

  const url = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
  );
  url.search = new URLSearchParams({ key: apiKey(), steamids: steamId }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Steam API ${response.status}`);

  const data = (await response.json()) as {
    response: { players: RawPlayer[] };
  };
  const player = data.response.players[0];
  if (!player) return null;

  return {
    steamId: player.steamid,
    personaName: player.personaname,
    avatarUrl: player.avatarmedium ?? null,
    profileUrl: player.profileurl,
    // 3 = public; 1 = private or friends only.
    isPublic: player.communityvisibilitystate === 3,
  };
}


type RawOwnedGame = { appid: number; name: string; playtime_forever: number };

// The user's Steam library, or null when Steam hides it (private profile or
// private "game details"). Cached briefly: playtime changes as people play.
export async function getOwnedGames(
  steamId: string,
): Promise<SteamOwnedGame[] | null> {
  "use cache";
  cacheLife("minutes");

  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
  );
  url.search = new URLSearchParams({
    key: apiKey(),
    steamid: steamId,
    include_appinfo: "1",
    include_played_free_games: "1",
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Steam API ${response.status}`);

  // A private library comes back as an empty "response" object.
  const data = (await response.json()) as {
    response: { games?: RawOwnedGame[] };
  };
  if (!data.response.games) return null;

  return data.response.games.map((game) => ({
    appId: game.appid,
    name: game.name,
    playtimeMinutes: game.playtime_forever,
  }));
}
