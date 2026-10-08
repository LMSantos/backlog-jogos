"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  STATUS_TAB_LABELS,
  dataVersion,
  type BacklogItem,
  type Priority,
  type Status,
} from "@/lib/backlog";
import {
  removeItem,
  updatePriority,
  updateRating,
  updateStatus,
  type ActionResult,
} from "./actions";

type SortKey = "priority" | "recent" | "shortest";

const SORT_LABELS: Record<SortKey, string> = {
  priority: "Prioridade",
  recent: "Adicionados por último",
  shortest: "Mais curtos primeiro",
};

const byRecent = (a: BacklogItem, b: BacklogItem) =>
  b.created_at.localeCompare(a.created_at);

const COMPARE: Record<SortKey, (a: BacklogItem, b: BacklogItem) => number> = {
  priority: (a, b) => a.priority - b.priority || byRecent(a, b),
  recent: byRecent,
  // Unknown durations go last.
  shortest: (a, b) =>
    (a.avg_playtime_hours ?? Infinity) - (b.avg_playtime_hours ?? Infinity) ||
    a.priority - b.priority,
};

const RATINGS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

const selectClass =
  "h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-base dark:border-zinc-700 dark:bg-zinc-900";

type Notice = { kind: "info" | "error"; text: string } | null;

export function BacklogBoard({ initialItems }: { initialItems: BacklogItem[] }) {
  const [items, setItems] = useState(initialItems);

  // Next.js keeps this component alive between navigations (React
  // <Activity>), so useState would hold on to the first list it got.
  // When the server sends changed data, adopt it, keeping tab/filter/sort.
  const serverVersion = dataVersion(initialItems);
  const [syncedVersion, setSyncedVersion] = useState(serverVersion);
  if (serverVersion !== syncedVersion) {
    setSyncedVersion(serverVersion);
    setItems(initialItems);
  }

  const [tab, setTab] = useState<Status>(() =>
    initialItems.some((item) => item.status === "playing")
      ? "playing"
      : "backlog",
  );
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [notice, setNotice] = useState<Notice>(null);

  const counts = useMemo(() => {
    const result = { playing: 0, backlog: 0, finished: 0, dropped: 0 };
    for (const item of items) result[item.status]++;
    return result;
  }, [items]);

  const platforms = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.platforms))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [items],
  );

  const visible = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.status === tab &&
            (platform === "all" || item.platforms.includes(platform)),
        )
        .sort(COMPARE[sort]),
    [items, tab, platform, sort],
  );

  function patchItem(id: string, patch: Partial<BacklogItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  // Optimistic update: change the screen right away, then save.
  // If the server refuses, put the old values back and explain why.
  async function save(
    item: BacklogItem,
    patch: Partial<BacklogItem>,
    action: () => Promise<ActionResult>,
  ) {
    setNotice(null);
    const previous = Object.fromEntries(
      Object.keys(patch).map((key) => [key, item[key as keyof BacklogItem]]),
    ) as Partial<BacklogItem>;
    patchItem(item.id, patch);

    const result = await action();
    if (!result.ok) {
      patchItem(item.id, previous);
      setNotice({ kind: "error", text: result.error });
    }
  }

  async function changeStatus(item: BacklogItem, status: Status) {
    await save(item, { status }, async () => {
      const result = await updateStatus(item.id, status);
      if (result.ok) {
        patchItem(item.id, {
          started_at: result.startedAt,
          finished_at: result.finishedAt,
        });
        setNotice({
          kind: "info",
          text: `“${item.title}” foi para ${STATUS_TAB_LABELS[status]}.`,
        });
      }
      return result;
    });
  }

  async function remove(item: BacklogItem) {
    if (!window.confirm(`Remover “${item.title}” do seu backlog?`)) return;

    setNotice(null);
    setItems((current) => current.filter((other) => other.id !== item.id));
    const result = await removeItem(item.id);
    if (!result.ok) {
      setItems((current) => [...current, item]);
      setNotice({ kind: "error", text: result.error });
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Seu backlog está vazio.
        </p>
        <Link
          href="/buscar"
          className="flex h-12 items-center rounded-lg bg-zinc-900 px-6 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Buscar jogos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setTab(status)}
            aria-pressed={tab === status}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium ${
              tab === status
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {STATUS_TAB_LABELS[status]} · {counts[status]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Plataforma
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className={selectClass}
          >
            <option value="all">Todas</option>
            {platforms.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Ordenar por
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className={selectClass}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div aria-live="polite">
        {notice && (
          <p
            role={notice.kind === "error" ? "alert" : undefined}
            className={`text-sm ${
              notice.kind === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Nenhum jogo em {STATUS_TAB_LABELS[tab]}
          {platform !== "all" && ` para ${platform}`}.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => (
            <BacklogCard
              key={item.id}
              item={item}
              onStatus={(status) => changeStatus(item, status)}
              onPriority={(priority) =>
                save(item, { priority }, () => updatePriority(item.id, priority))
              }
              onRating={(rating) =>
                save(item, { rating }, () => updateRating(item.id, rating))
              }
              onRemove={() => remove(item)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BacklogCard({
  item,
  onStatus,
  onPriority,
  onRating,
  onRemove,
}: {
  item: BacklogItem;
  onStatus: (status: Status) => void;
  onPriority: (priority: Priority) => void;
  onRating: (rating: number | null) => void;
  onRemove: () => void;
}) {
  const details = [
    item.avg_playtime_hours ? `~${item.avg_playtime_hours} h` : null,
    item.platforms.slice(0, 2).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
        {item.cover_url && (
          <Image
            src={item.cover_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            unoptimized
            className="object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        <div className="min-h-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-tight">
            {item.title}
          </p>
          {details && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{details}</p>
          )}
        </div>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Status
          <select
            value={item.status}
            onChange={(event) => onStatus(event.target.value as Status)}
            className={selectClass}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Prioridade
            <select
              value={item.priority}
              onChange={(event) =>
                onPriority(Number(event.target.value) as Priority)
              }
              className={selectClass}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Nota
            <select
              value={item.rating ?? ""}
              onChange={(event) =>
                onRating(event.target.value ? Number(event.target.value) : null)
              }
              className={selectClass}
            >
              <option value="">–</option>
              {RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="self-start py-1 text-xs text-zinc-500 underline underline-offset-2"
        >
          Remover
        </button>
      </div>
    </li>
  );
}
