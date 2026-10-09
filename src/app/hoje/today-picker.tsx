"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { updateStatus } from "@/app/backlog/actions";
import {
  dataVersion,
  estimateHours,
  STATUS_LABELS,
  type BacklogItem,
} from "@/lib/backlog";
import {
  MOOD_OPTIONS,
  pickSuggestion,
  TIME_OPTIONS,
  type MoodOption,
  type Scored,
  type TimeOption,
} from "@/lib/suggest";

const primaryButton =
  "flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-6 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900";
const secondaryButton =
  "flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-6 font-medium disabled:opacity-60 dark:border-zinc-700";

export function TodayPicker({ initialItems }: { initialItems: BacklogItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [time, setTime] = useState<TimeOption | null>(null);
  const [mood, setMood] = useState<MoodOption | null>(null);
  const [suggestion, setSuggestion] = useState<Scored | null>(null);
  // Games already suggested in this round, so "outra sugestão" doesn't repeat.
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Next.js keeps this component alive between navigations (React
  // <Activity>), so useState would hold on to the first list it got.
  // When the server sends changed data, adopt it, keeping time and mood.
  const serverVersion = dataVersion(initialItems);
  const [syncedVersion, setSyncedVersion] = useState(serverVersion);
  if (serverVersion !== syncedVersion) {
    setSyncedVersion(serverVersion);
    setItems(initialItems);
    // Keep showing the suggestion with fresh data, or drop it if the game
    // was removed or is no longer in the backlog / playing.
    const fresh =
      suggestion &&
      initialItems.find((item) => item.id === suggestion.item.id);
    setSuggestion(fresh ? { ...suggestion, item: fresh } : null);
  }

  // On phones the result is below the fold: bring it into view.
  useEffect(() => {
    if (suggestion) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [suggestion]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Nenhum jogo no backlog ou em andamento para sortear.
        </p>
        <Link href="/buscar" className={primaryButton}>
          Buscar jogos
        </Link>
      </div>
    );
  }

  function resetRound() {
    setSuggestion(null);
    setShown(new Set());
    setError(null);
  }

  function draw() {
    if (!time || !mood) return;
    setError(null);
    const pick = pickSuggestion(items, time, mood, shown);
    if (!pick) return;
    setSuggestion(pick);
    // If the pick was already shown, every game was seen: start a new round.
    setShown(
      shown.has(pick.item.id)
        ? new Set([pick.item.id])
        : new Set(shown).add(pick.item.id),
    );
  }

  async function startPlaying(item: BacklogItem) {
    setStarting(true);
    setError(null);
    const result = await updateStatus(item.id, "playing");
    setStarting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const updated: BacklogItem = {
      ...item,
      status: "playing",
      started_at: result.startedAt,
    };
    setItems((current) =>
      current.map((other) => (other.id === item.id ? updated : other)),
    );
    setSuggestion((current) => current && { ...current, item: updated });
  }

  return (
    <div className="flex flex-col gap-6">
      <OptionGroup
        legend="Quanto tempo você tem?"
        name="time"
        options={TIME_OPTIONS}
        value={time}
        onChange={(value) => {
          setTime(value);
          resetRound();
        }}
      />
      <OptionGroup
        legend="Qual é o clima?"
        name="mood"
        options={MOOD_OPTIONS}
        value={mood}
        onChange={(value) => {
          setMood(value);
          resetRound();
        }}
      />

      {!suggestion && (
        <button
          type="button"
          onClick={draw}
          disabled={!time || !mood}
          className={primaryButton}
        >
          {time && mood ? "Sortear 🎲" : "Escolha o tempo e o clima"}
        </button>
      )}

      {suggestion && (
        <div ref={resultRef} className="flex scroll-mt-4 flex-col gap-4">
          <SuggestionCard suggestion={suggestion} />

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {suggestion.item.status === "backlog" ? (
              <button
                type="button"
                onClick={() => startPlaying(suggestion.item)}
                disabled={starting}
                className={primaryButton}
              >
                {starting ? "Salvando…" : "Começar a jogar"}
              </button>
            ) : (
              <p className="flex h-12 items-center justify-center font-medium text-emerald-700 dark:text-emerald-400">
                Bom jogo! 🎮
              </p>
            )}
            <button type="button" onClick={draw} className={secondaryButton}>
              {items.length > 1 ? "Outra sugestão" : "Sortear de novo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(options) as T[]).map((key) => (
          <label
            key={key}
            className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-medium has-checked:border-zinc-900 has-checked:bg-zinc-900 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-zinc-500 dark:border-zinc-700 dark:has-checked:border-zinc-100 dark:has-checked:bg-zinc-100 dark:has-checked:text-zinc-900"
          >
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              onChange={() => onChange(key)}
              className="sr-only"
            />
            {options[key]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Scored }) {
  const { item, reasons } = suggestion;
  const details = [
    STATUS_LABELS[item.status],
    estimateHours(item)
      ? `~${estimateHours(item)} h${item.my_estimate_hours ? " (minha)" : ""}`
      : null,
    item.platforms.slice(0, 3).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
        {item.cover_url && (
          <Image
            src={item.cover_url}
            alt=""
            fill
            sizes="(min-width: 640px) 576px, 100vw"
            unoptimized
            className="object-cover"
          />
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="text-sm text-zinc-500">Que tal…</p>
        <h2 className="text-xl font-semibold leading-tight">{item.title}</h2>
        <p className="text-sm text-zinc-500">{details}</p>
        {reasons.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {reasons.map((reason) => (
              <li key={reason}>✓ {reason}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
