"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { SteamOwnedGame } from "@/lib/steam-types";
import { importSteamGames, type ImportResult } from "./actions";
import { MAX_IMPORT } from "./limits";

function formatPlaytime(minutes: number) {
  if (minutes === 0) return "Nunca jogado";
  if (minutes < 60) return `${minutes} min jogados`;
  return `${Math.round(minutes / 60)} h jogadas`;
}

export function ImportList({
  games,
  importedIds,
}: {
  games: SteamOwnedGame[];
  importedIds: number[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [justImported, setJustImported] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);

  // The import button sits at the bottom of a long list: when it finishes,
  // bring the summary into view so the result can be read.
  useEffect(() => {
    if (result) {
      summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const alreadyImported = useMemo(
    () => new Set([...importedIds, ...justImported]),
    [importedIds, justImported],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? games.filter((game) => game.name.toLowerCase().includes(term))
      : games;
  }, [games, query]);

  const atLimit = selected.size >= MAX_IMPORT;

  function toggle(appId: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(appId)) next.delete(appId);
      else if (next.size < MAX_IMPORT) next.add(appId);
      return next;
    });
  }

  function handleImport() {
    const appIds = [...selected];
    setResult(null);
    startTransition(async () => {
      const outcome = await importSteamGames(appIds);
      setResult(outcome);
      if (outcome.ok) {
        const done = [...outcome.imported, ...outcome.byName, ...outcome.updated];
        setJustImported(
          (current) => new Set([...current, ...done.map((game) => game.appId)]),
        );
        setSelected(new Set());
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {games.length} jogos na sua Steam. Marque os que quer no backlog (até{" "}
        {MAX_IMPORT} por vez).
      </p>

      <div ref={summaryRef} className="scroll-mt-4">
        {result && <ImportSummary result={result} />}
      </div>

      <label htmlFor="library-search" className="sr-only">
        Filtrar biblioteca
      </label>
      <input
        id="library-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filtrar pelo nome"
        autoComplete="off"
        className="h-12 rounded-lg border border-zinc-300 bg-transparent px-3 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />

      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {visible.map((game) => {
          const imported = alreadyImported.has(game.appId);
          const checked = selected.has(game.appId);
          return (
            <li key={game.appId}>
              <label
                className={`flex min-h-14 items-center gap-3 py-2 ${
                  imported ? "opacity-60" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={imported || pending || (atLimit && !checked)}
                  onChange={() => toggle(game.appId)}
                  className="size-5 shrink-0 accent-zinc-900 dark:accent-zinc-100"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{game.name}</span>
                  <span className="block text-sm text-zinc-500">
                    {formatPlaytime(game.playtimeMinutes)}
                  </span>
                </span>
                {imported && (
                  <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    ✓ No backlog
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {/* Fixed action bar, right above the bottom menu on phones (4rem +
          safe area) and at the very bottom from sm up, where the menu is
          at the top. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t sm:bottom-0 border-zinc-200 bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
            {pending
              ? "Importando… pode levar alguns segundos."
              : `${selected.size} selecionado${selected.size === 1 ? "" : "s"}`}
          </p>
          <button
            type="button"
            onClick={handleImport}
            disabled={selected.size === 0 || pending}
            className="h-12 rounded-lg bg-zinc-900 px-5 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportSummary({ result }: { result: ImportResult }) {
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {result.error}
      </p>
    );
  }

  const added = result.imported.length + result.byName.length;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50"
    >
      <p className="font-medium">
        {added} jogo{added === 1 ? "" : "s"} adicionado
        {added === 1 ? "" : "s"} ao backlog.{" "}
        <Link href="/backlog" className="underline underline-offset-2">
          Ver backlog
        </Link>
      </p>
      {result.updated.length > 0 && (
        <p>
          Já estavam no backlog (horas da Steam atualizadas):{" "}
          {result.updated.map((game) => game.title).join(", ")}.
        </p>
      )}
      {result.byName.length > 0 && (
        <p>
          <strong>Confira:</strong> ligados só pelo nome, podem ser outra
          versão do jogo: {result.byName.map((game) => game.title).join(", ")}.
          Se algum estiver errado, remova no backlog e adicione pela busca.
        </p>
      )}
      {result.notFound.length > 0 && (
        <p>
          <strong>Não encontrados na RAWG:</strong>{" "}
          {result.notFound.map((game) => game.title).join(", ")}. Tente pela{" "}
          <Link href="/buscar" className="underline underline-offset-2">
            busca
          </Link>
          .
        </p>
      )}
      {result.rawgFailed.length > 0 && (
        <p>
          <strong>A RAWG não respondeu para:</strong>{" "}
          {result.rawgFailed.map((game) => game.title).join(", ")}. Tente
          importar esses de novo daqui a pouco.
        </p>
      )}
      {result.saveFailed.length > 0 && (
        <p>
          <strong>Não foi possível salvar:</strong>{" "}
          {result.saveFailed.map((game) => game.title).join(", ")}. Tente de
          novo; se continuar, avise quem cuida do app.
        </p>
      )}
    </div>
  );
}
