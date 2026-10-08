// Achievement progress: bar plus "23/50 · 46%".
export function ProgressBar({
  value,
  total,
  compact = false,
}: {
  value: number;
  total: number;
  compact?: boolean;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-label="Conquistas desbloqueadas"
        className={`flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${compact ? "h-1.5" : "h-2.5"}`}
      >
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className={`shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400 ${compact ? "text-xs" : "text-sm"}`}
      >
        {value}/{total} · {percent}%
      </span>
    </div>
  );
}
