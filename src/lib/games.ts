// Game data as the app uses it. Shared by server code and Client Components,
// so it must not import anything server-only.
export type Game = {
  rawgId: number;
  title: string;
  coverUrl: string | null;
  platforms: string[];
  genres: string[];
  releaseYear: number | null;
  avgPlaytimeHours: number | null;
};

export type SearchResult = Game & { inBacklog: boolean };
