// "O que jogo hoje?": weighted draw among backlog / playing games.
// Pure functions (no React, no Supabase), shared with the browser.
import { estimateHours, type BacklogItem } from "./backlog";

export const TIME_OPTIONS = {
  short: "Até 1h",
  session: "1 a 3h",
  weekend: "Fim de semana inteiro",
  long: "Quero começar algo longo",
} as const;
export type TimeOption = keyof typeof TIME_OPTIONS;

export const MOOD_OPTIONS = {
  relax: "Relaxar",
  challenge: "Desafio",
  story: "Boa história",
  friends: "Jogar com amigos",
} as const;
export type MoodOption = keyof typeof MOOD_OPTIONS;

// RAWG genre names (in English, as stored in backlog_items.genres).
const MOOD_GENRES: Record<MoodOption, string[]> = {
  relax: [
    "Casual",
    "Simulation",
    "Puzzle",
    "Family",
    "Racing",
    "Sports",
    "Card",
    "Board Games",
  ],
  challenge: [
    "Action",
    "Platformer",
    "Fighting",
    "Shooter",
    "Strategy",
    "Arcade",
  ],
  story: ["Adventure", "RPG"],
  // RAWG genres don't say whether a game has co-op, so this is a best guess.
  friends: [
    "Massively Multiplayer",
    "Sports",
    "Racing",
    "Fighting",
    "Shooter",
    "Board Games",
    "Card",
  ],
};

const GENRE_LABELS: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Arcade: "Arcade",
  "Board Games": "Tabuleiro",
  Card: "Cartas",
  Casual: "Casual",
  Family: "Família",
  Fighting: "Luta",
  "Massively Multiplayer": "Multijogador",
  Platformer: "Plataforma",
  Puzzle: "Puzzle",
  Racing: "Corrida",
  RPG: "RPG",
  Shooter: "Tiro",
  Simulation: "Simulação",
  Sports: "Esportes",
  Strategy: "Estratégia",
};

const PRIORITY_WEIGHT = { 1: 3, 2: 2, 3: 1 } as const;
const MOOD_MATCH_WEIGHT = 2;
const MOOD_MISS_WEIGHT = 0.6;
const PLAYING_WEIGHT = 2.5;
// "Quero começar algo longo" is about starting something new.
const PLAYING_WHEN_STARTING_NEW_WEIGHT = 0.2;
const UNKNOWN_DURATION_WEIGHT = 0.6;

// How well a game's average playtime fits the time the player has.
// Returns a weight and, when it fits well, a reason to show.
function durationFit(
  hours: number | null,
  time: TimeOption,
  playing: boolean,
): { weight: number; reason?: string } {
  if (hours === null) return { weight: UNKNOWN_DURATION_WEIGHT };

  switch (time) {
    case "short":
      if (hours <= 3) return { weight: 1, reason: `Curtinho: ~${hours} h` };
      // A long game you're already playing still works for a quick session.
      if (playing) return { weight: 0.8 };
      return { weight: hours <= 10 ? 0.5 : 0.2 };
    case "session":
      if (hours <= 3)
        return { weight: 1, reason: `Dá para zerar hoje: ~${hours} h` };
      return { weight: hours <= 15 ? 0.8 : 0.4 };
    case "weekend":
      if (hours <= 20)
        return {
          weight: hours >= 5 ? 1 : 0.7,
          reason: `Cabe no fim de semana: ~${hours} h`,
        };
      return { weight: hours <= 40 ? 0.6 : 0.3 };
    case "long":
      if (hours >= 30)
        return { weight: 1, reason: `Jornada longa: ~${hours} h` };
      return { weight: hours >= 15 ? 0.7 : 0.15 };
  }
}

export type Scored = { item: BacklogItem; weight: number; reasons: string[] };

export function scoreItem(
  item: BacklogItem,
  time: TimeOption,
  mood: MoodOption,
): Scored {
  const reasons: string[] = [];
  const playing = item.status === "playing";

  let weight = PRIORITY_WEIGHT[item.priority];
  if (item.priority === 1) reasons.push("Prioridade alta");

  const matched = item.genres.filter((genre) =>
    MOOD_GENRES[mood].includes(genre),
  );
  if (matched.length) {
    weight *= MOOD_MATCH_WEIGHT;
    const names = matched.map((genre) => GENRE_LABELS[genre] ?? genre);
    reasons.push(
      `${names.join(", ")} combina com “${MOOD_OPTIONS[mood].toLowerCase()}”`,
    );
  } else {
    weight *= MOOD_MISS_WEIGHT;
  }

  const fit = durationFit(estimateHours(item), time, playing);
  weight *= fit.weight;
  if (fit.reason) reasons.push(fit.reason);

  // Prefer finishing what was started, unless the player wants something new.
  if (playing && time === "long") {
    weight *= PLAYING_WHEN_STARTING_NEW_WEIGHT;
  } else if (playing) {
    weight *= PLAYING_WEIGHT;
    reasons.unshift("Você já está jogando: bora terminar!");
  }

  return { item, weight, reasons };
}

// Weighted random pick. `skip` holds ids already suggested in this round;
// when every game was shown, the round starts over.
export function pickSuggestion(
  items: BacklogItem[],
  time: TimeOption,
  mood: MoodOption,
  skip: ReadonlySet<string>,
  random: () => number = Math.random,
): Scored | null {
  const candidates = items.filter(
    (item) => item.status === "backlog" || item.status === "playing",
  );
  if (candidates.length === 0) return null;

  const fresh = candidates.filter((item) => !skip.has(item.id));
  const pool = (fresh.length ? fresh : candidates).map((item) =>
    scoreItem(item, time, mood),
  );

  const total = pool.reduce((sum, scored) => sum + scored.weight, 0);
  let target = random() * total;
  for (const scored of pool) {
    target -= scored.weight;
    if (target < 0) return scored;
  }
  return pool[pool.length - 1];
}
