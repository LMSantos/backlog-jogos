"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { SearchResult } from "@/lib/games";
import { addToBacklog } from "./actions";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

type Search =
  | { query: string; status: "ok"; results: SearchResult[] }
  | { query: string; status: "error" };

export function GameSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search | null>(null);
  const [retries, setRetries] = useState(0);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;
  // Results are stale while the latest query hasn't come back yet.
  const loading = !tooShort && search?.query !== trimmed;

  useEffect(() => {
    if (tooShort) return;

    // Debounce: wait until the user stops typing, and cancel the previous
    // request so an old answer can't overwrite a newer one.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/games/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);
        const data = (await response.json()) as { results: SearchResult[] };
        setSearch({ query: trimmed, status: "ok", results: data.results });
      } catch {
        if (controller.signal.aborted) return;
        setSearch({ query: trimmed, status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, tooShort, retries, router]);

  function retry() {
    setSearch(null);
    setRetries((count) => count + 1);
  }

  function markAdded(rawgId: number) {
    setAddedIds((ids) => new Set(ids).add(rawgId));
  }

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="game-search" className="sr-only">
        Nome do jogo
      </label>
      <input
        id="game-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ex.: Hollow Knight"
        autoFocus
        autoComplete="off"
        enterKeyHint="search"
        className="h-12 rounded-lg border border-zinc-300 bg-transparent px-3 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />

      <div aria-live="polite">
        {tooShort ? (
          <p className="text-sm text-zinc-500">
            Digite pelo menos {MIN_QUERY_LENGTH} letras para buscar.
          </p>
        ) : loading ? (
          <p className="text-sm text-zinc-500">Buscando…</p>
        ) : search?.status === "error" ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-600 dark:text-red-400">
              A busca falhou. A RAWG às vezes fica instável.
            </p>
            <button
              type="button"
              onClick={retry}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
            >
              Tentar de novo
            </button>
          </div>
        ) : search?.results.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nenhum jogo encontrado para “{trimmed}”.
          </p>
        ) : null}
      </div>

      {!tooShort && search?.status === "ok" && search.results.length > 0 && (
        <ul
          className={`flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 ${loading ? "opacity-50" : ""}`}
        >
          {search.results.map((game) => (
            <GameRow
              key={game.rawgId}
              game={game}
              inBacklog={game.inBacklog || addedIds.has(game.rawgId)}
              onAdded={markAdded}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function GameRow({
  game,
  inBacklog,
  onAdded,
}: {
  game: SearchResult;
  inBacklog: boolean;
  onAdded: (rawgId: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addToBacklog(game.rawgId);
      if (result.ok) onAdded(game.rawgId);
      else setError(result.error);
    });
  }

  const shownPlatforms = game.platforms.slice(0, 3).join(", ");
  const hiddenPlatforms = game.platforms.length - 3;

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
        {game.coverUrl && (
          <Image
            src={game.coverUrl}
            alt=""
            fill
            sizes="96px"
            unoptimized
            className="object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{game.title}</p>
        <p className="truncate text-sm text-zinc-500">
          {[game.releaseYear, shownPlatforms].filter(Boolean).join(" · ")}
          {hiddenPlatforms > 0 && ` +${hiddenPlatforms}`}
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {inBacklog ? (
        <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          ✓ No backlog
        </span>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="h-10 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "…" : "Adicionar"}
        </button>
      )}
    </li>
  );
}
