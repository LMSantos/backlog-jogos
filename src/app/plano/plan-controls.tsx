"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/button-styles";
import {
  addToPlan,
  removeFromPlan,
  setWeeklyHours,
  swapPlanItems,
  type PlanActionResult,
} from "./actions";

// The page re-renders with fresh data after each action (revalidatePath),
// so these components keep no copy of the plan: just pending/error state.
function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(action: () => Promise<PlanActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }
  return { pending, error, run };
}

export function WeeklyHoursField({ initial }: { initial: number | null }) {
  const { pending, error, run } = useAction();

  function commit(input: HTMLInputElement) {
    const raw = input.value.trim();
    const hours = raw === "" ? null : Number(raw);
    if (hours === initial) return;
    run(() => setWeeklyHours(hours));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm">
        Tenho
        <input
          key={initial ?? "none"}
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          defaultValue={initial ?? ""}
          placeholder="8"
          disabled={pending}
          onBlur={(event) => commit(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="h-10 w-20 rounded-md border border-zinc-300 bg-white px-2 text-center text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
        horas por semana para jogar
      </label>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function PlanRowControls({
  itemId,
  previousId,
  nextId,
  title,
}: {
  itemId: string;
  previousId: string | null;
  nextId: string | null;
  title: string;
}) {
  const { pending, error, run } = useAction();
  const small = buttonClass({ size: "sm" });

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          aria-label={`Subir ${title} na fila`}
          disabled={pending || !previousId}
          onClick={() => previousId && run(() => swapPlanItems(itemId, previousId))}
          className={`${small} w-8 px-0`}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Descer ${title} na fila`}
          disabled={pending || !nextId}
          onClick={() => nextId && run(() => swapPlanItems(itemId, nextId))}
          className={`${small} w-8 px-0`}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label={`Tirar ${title} do plano`}
          disabled={pending}
          onClick={() => run(() => removeFromPlan(itemId))}
          className={`${buttonClass({ variant: "danger", size: "sm" })} w-8 px-0`}
        >
          ✕
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function AddToPlanButton({ itemId }: { itemId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => addToPlan(itemId))}
        className={buttonClass({ size: "sm" })}
      >
        {pending ? "…" : "+ Adicionar"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
