// Steam data shapes shared with Client Components (no server code here).
export type SteamOwnedGame = {
  appId: number;
  name: string;
  playtimeMinutes: number;
};
