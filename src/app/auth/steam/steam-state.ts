// Shared by the Steam start and callback routes.
// The state is a random value kept in a cookie and echoed back by Steam in
// return_to, so a callback can't be triggered by a login we didn't start
// (CSRF protection).
export const STEAM_STATE_COOKIE = "steam_openid_state";
export const STEAM_STATE_COOKIE_PATH = "/auth/steam";

export function steamCallbackUrl(origin: string, state: string) {
  return `${origin}/auth/steam/callback?state=${encodeURIComponent(state)}`;
}
