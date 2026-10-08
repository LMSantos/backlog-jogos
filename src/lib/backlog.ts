// Backlog types and labels. Shared by server code and Client Components,
// so it must not import anything server-only.

export const STATUSES = ["playing", "backlog", "finished", "dropped"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  playing: "Jogando",
  backlog: "Backlog",
  finished: "Zerado",
  dropped: "Abandonado",
};

// Plural labels for the tabs.
export const STATUS_TAB_LABELS: Record<Status, string> = {
  playing: "Jogando",
  backlog: "Backlog",
  finished: "Zerados",
  dropped: "Abandonados",
};

export const PRIORITIES = [1, 2, 3] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Alta",
  2: "Média",
  3: "Baixa",
};

export type BacklogItem = {
  id: string;
  rawg_id: number;
  title: string;
  cover_url: string | null;
  platforms: string[];
  genres: string[];
  release_year: number | null;
  avg_playtime_hours: number | null;
  status: Status;
  priority: Priority;
  rating: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  steam_app_id: number | null;
  steam_playtime_minutes: number | null;
};

export const BACKLOG_ITEM_COLUMNS =
  "id, rawg_id, title, cover_url, platforms, genres, release_year, avg_playtime_hours, status, priority, rating, started_at, finished_at, created_at, updated_at, steam_app_id, steam_playtime_minutes";

// Changes whenever a game is added, edited (updated_at is set by a trigger)
// or removed. Client Components use it to notice fresh data from the server.
export function dataVersion(items: BacklogItem[]) {
  const latest = items.reduce(
    (max, item) => (item.updated_at > max ? item.updated_at : max),
    "",
  );
  return `${items.length}:${latest}`;
}

export function isStatus(value: unknown): value is Status {
  return STATUSES.includes(value as Status);
}

export function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}
