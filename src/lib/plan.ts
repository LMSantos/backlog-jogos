// "Plano": fits the games in the plan queue into months, given the hours per
// week available. Pure functions (no React, no Supabase).
// Only games IN the plan (plan_position not null) take part.
import { estimateHours, type BacklogItem } from "./backlog";

// Months are counted in Brazil time.
const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function brazilDate(date: Date) {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month), // 1-12
    day: Number(parts.day),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export type MonthKey = { year: number; month: number };

// One game's share of one month. A long game shows up in every month it
// uses, so no month looks empty while a big game is being played.
export type PlannedGame = {
  item: BacklogItem;
  // Hours of this game placed in this month (null: game has no estimate).
  hoursThisMonth: number | null;
  finished: boolean;
  // true in the month the game is expected to be finished.
  endsThisMonth: boolean;
  // The game also uses hours in earlier months of the plan.
  startedBefore: boolean;
};

export type PlanMonth = MonthKey & {
  capacityHours: number;
  plannedHours: number;
  games: PlannedGame[];
};

export type Plan = {
  months: PlanMonth[];
  current: {
    finished: number;
    total: number;
  };
  totalRemainingHours: number;
  withoutEstimate: number;
};

const MAX_MONTHS = 36;

// Hours left to finish an unfinished game in the plan.
export function remainingHours(item: BacklogItem): number | null {
  const estimate = estimateHours(item);
  if (estimate === null) return null;
  const played = (item.steam_playtime_minutes ?? 0) / 60;
  // Already past the estimate but not finished: keep a little room for it.
  return Math.max(Math.round((estimate - played) * 10) / 10, 1);
}

export function buildPlan(
  planItems: BacklogItem[],
  weeklyHours: number,
  now: Date,
): Plan {
  const today = brazilDate(now);
  const ordered = [...planItems].sort(
    (a, b) => (a.plan_position ?? 0) - (b.plan_position ?? 0),
  );

  // Finished games count in the month they were finished (only this month's
  // are shown); dropped games are out of the plan.
  const finishedThisMonth = ordered.filter((item) => {
    if (item.status !== "finished" || !item.finished_at) return false;
    const done = brazilDate(new Date(item.finished_at));
    return done.year === today.year && done.month === today.month;
  });
  const active = ordered.filter(
    (item) => item.status === "backlog" || item.status === "playing",
  );

  const months: PlanMonth[] = [];
  function monthAt(index: number): PlanMonth {
    while (months.length <= index) {
      const offset = months.length;
      const monthIndex = today.month - 1 + offset;
      const year = today.year + Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      const days = daysInMonth(year, month);
      // This month: only the days left (today included).
      const usableDays = offset === 0 ? days - today.day + 1 : days;
      months.push({
        year,
        month,
        capacityHours: Math.round(((weeklyHours * usableDays) / 7) * 10) / 10,
        plannedHours: 0,
        games: [],
      });
    }
    return months[index];
  }

  monthAt(0).games.push(
    ...finishedThisMonth.map((item) => ({
      item,
      hoursThisMonth: 0,
      finished: true,
      endsThisMonth: true,
      startedBefore: false,
    })),
  );

  let monthIndex = 0;
  let totalRemaining = 0;
  let withoutEstimate = 0;

  for (const item of active) {
    const needed = remainingHours(item);
    if (needed === null) {
      // No estimate: can't be fitted. Show it where the queue currently is.
      withoutEstimate++;
      monthAt(monthIndex).games.push({
        item,
        hoursThisMonth: null,
        finished: false,
        endsThisMonth: false,
        startedBefore: false,
      });
      continue;
    }

    totalRemaining += needed;
    let left = needed;
    let usedMonths = 0;
    // Fill month after month until all of the game's hours are placed.
    while (left > 0 && monthIndex < MAX_MONTHS) {
      const month = monthAt(monthIndex);
      const free = Math.round((month.capacityHours - month.plannedHours) * 10) / 10;
      if (free <= 0) {
        monthIndex++;
        continue;
      }
      const used = Math.min(free, left);
      month.plannedHours = Math.round((month.plannedHours + used) * 10) / 10;
      left = Math.round((left - used) * 10) / 10;
      month.games.push({
        item,
        hoursThisMonth: Math.round(used * 10) / 10,
        finished: false,
        endsThisMonth: left <= 0,
        startedBefore: usedMonths > 0,
      });
      usedMonths++;
      if (left > 0) monthIndex++;
    }
  }

  const currentGames = months[0]?.games ?? [];
  // Progress of the month: games that should be finished this month.
  const goals = currentGames.filter((game) => game.endsThisMonth);
  return {
    months: months.filter((month, index) => index === 0 || month.games.length),
    current: {
      finished: goals.filter((game) => game.finished).length,
      total: goals.length,
    },
    totalRemainingHours: Math.round(totalRemaining),
    withoutEstimate,
  };
}

const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

export function monthLabel({ year, month }: MonthKey, currentYear: number) {
  const name = monthFormat.format(new Date(Date.UTC(year, month - 1, 15)));
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return year === currentYear ? capitalized : `${capitalized} de ${year}`;
}
