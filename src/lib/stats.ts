import { estimateHours, type BacklogItem } from "./backlog";

// Years are counted in Brazil time, so a game finished on Dec 31 at 22:00
// (already Jan 1 in UTC) still counts for the right year.
const yearFormat = new Intl.DateTimeFormat("en", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

function yearInBrazil(date: Date) {
  return Number(yearFormat.format(date));
}

export type BacklogStats = {
  backlogCount: number;
  finishedThisYear: number;
  year: number;
  // Average playtime of everything not finished yet (backlog + playing).
  hoursToFinish: number;
  // Games left out of hoursToFinish because RAWG has no playtime for them.
  unknownDurationCount: number;
};

export function computeStats(items: BacklogItem[], now: Date): BacklogStats {
  const year = yearInBrazil(now);
  const remaining = items.filter(
    (item) => item.status === "backlog" || item.status === "playing",
  );

  return {
    backlogCount: items.filter((item) => item.status === "backlog").length,
    finishedThisYear: items.filter(
      (item) =>
        item.status === "finished" &&
        item.finished_at !== null &&
        yearInBrazil(new Date(item.finished_at)) === year,
    ).length,
    year,
    hoursToFinish: remaining.reduce(
      (sum, item) => sum + (estimateHours(item) ?? 0),
      0,
    ),
    unknownDurationCount: remaining.filter(
      (item) => estimateHours(item) === null,
    ).length,
  };
}
