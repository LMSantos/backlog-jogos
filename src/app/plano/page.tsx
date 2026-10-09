import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ProgressBar } from "@/components/progress-bar";
import { RawgCredit } from "@/components/rawg-credit";
import { getUserId } from "@/lib/auth";
import {
  BACKLOG_ITEM_COLUMNS,
  MY_PLATFORM_LABELS,
  estimateHours,
  type BacklogItem,
} from "@/lib/backlog";
import { buildPlan, monthLabel, type PlannedGame } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import {
  AddToPlanButton,
  PlanRowControls,
  WeeklyHoursField,
} from "./plan-controls";

export const metadata: Metadata = {
  title: "Meu plano | Backlog de Jogos",
};

export default function PlanPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Meu plano</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        <PlanContent />
      </Suspense>
      <RawgCredit />
    </main>
  );
}

async function PlanContent() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const [{ data: profile }, { data }] = await Promise.all([
    supabase
      .from("profiles")
      .select("weekly_hours")
      .eq("id", userId)
      .maybeSingle<{ weekly_hours: number | null }>(),
    supabase
      .from("backlog_items")
      .select(BACKLOG_ITEM_COLUMNS)
      .eq("user_id", userId),
  ]);
  if (!profile) redirect("/onboarding");

  const items = (data ?? []) as BacklogItem[];
  const inPlan = items.filter((item) => item.plan_position !== null);
  // Candidates: games that can still be played and aren't in the plan yet.
  const candidates = items
    .filter(
      (item) =>
        item.plan_position === null &&
        (item.status === "backlog" || item.status === "playing"),
    )
    .sort(
      (a, b) =>
        (a.status === "playing" ? 0 : 1) - (b.status === "playing" ? 0 : 1) ||
        a.priority - b.priority ||
        a.title.localeCompare(b.title, "pt-BR"),
    );

  const weeklyHours = profile.weekly_hours;

  return (
    <>
      <WeeklyHoursField initial={weeklyHours} />

      {!weeklyHours ? (
        <Notice>
          Diga quantas horas por semana você tem para jogar, e o plano encaixa
          os jogos mês a mês.
        </Notice>
      ) : inPlan.length === 0 ? (
        <Notice>
          Seu plano está vazio. Adicione abaixo os jogos que você quer encarar,
          na ordem em que pretende jogar.
        </Notice>
      ) : (
        <PlanView items={inPlan} weeklyHours={weeklyHours} />
      )}

      {candidates.length > 0 && (
        <details
          className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          open={inPlan.length === 0}
        >
          <summary className="cursor-pointer font-medium">
            Adicionar jogos ao plano ({candidates.length})
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {candidates.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2">
                <Cover item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {gameMeta(item)}
                  </p>
                </div>
                <AddToPlanButton itemId={item.id} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function PlanView({
  items,
  weeklyHours,
}: {
  items: BacklogItem[];
  weeklyHours: number;
}) {
  const now = new Date();
  const plan = buildPlan(items, weeklyHours, now);
  const currentYear = plan.months[0].year;
  const thisMonth = plan.months[0];
  const lastMonth = plan.months[plan.months.length - 1];

  // Queue order of games still to play, for the ↑ ↓ buttons.
  const queue = items
    .filter((item) => item.status === "backlog" || item.status === "playing")
    .sort((a, b) => (a.plan_position ?? 0) - (b.plan_position ?? 0))
    .map((item) => item.id);

  return (
    <>
      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-semibold">
          {monthLabel(thisMonth, currentYear)}: zerar{" "}
          {plan.current.total === 1 ? "1 jogo" : `${plan.current.total} jogos`}
        </h2>
        {plan.current.total > 0 ? (
          <ProgressBar
            value={plan.current.finished}
            total={plan.current.total}
          />
        ) : (
          <p className="text-sm text-zinc-500">
            Nenhum jogo do plano termina este mês.
          </p>
        )}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ~{Math.round(thisMonth.plannedHours)} h planejadas de ~
          {Math.round(thisMonth.capacityHours)} h livres até o fim do mês.
          {queue.length > 0 &&
            ` Fila: ${queue.length} ${queue.length === 1 ? "jogo" : "jogos"}, ~${plan.totalRemainingHours} h, até ${monthLabel(lastMonth, currentYear).toLowerCase()}.`}
        </p>
        {plan.withoutEstimate > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            ⚠ {plan.withoutEstimate}{" "}
            {plan.withoutEstimate === 1 ? "jogo está" : "jogos estão"} sem
            estimativa de tempo e não entram no encaixe. Defina a &quot;Minha
            estimativa&quot; no backlog.
          </p>
        )}
      </section>

      {plan.months.map((month, index) => (
        <section key={`${month.year}-${month.month}`} className="flex flex-col gap-2">
          <h2 className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold">
              {monthLabel(month, currentYear)}
            </span>
            <span className="text-xs text-zinc-500">
              ~{Math.round(month.plannedHours)} h de ~
              {Math.round(month.capacityHours)} h
              {index === 0 ? " (até o fim do mês)" : ""}
            </span>
          </h2>
          {month.games.length === 0 ? (
            <p className="text-sm text-zinc-500">Nada planejado.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {month.games.map((game) => {
                const position = queue.indexOf(game.item.id);
                // Controls only on the game's first appearance in the plan.
                const showControls = !game.finished && !game.startedBefore;
                return (
                  <li
                    key={game.item.id}
                    className="flex items-center gap-3 py-2"
                  >
                    <Cover item={game.item} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/jogo/${game.item.id}`}
                        className="block truncate text-sm font-medium underline-offset-2 hover:underline"
                      >
                        {statusIcon(game)} {game.item.title}
                      </Link>
                      <p className="truncate text-xs text-zinc-500">
                        {plannedMeta(game)}
                      </p>
                    </div>
                    {showControls && (
                      <PlanRowControls
                        itemId={game.item.id}
                        title={game.item.title}
                        previousId={position > 0 ? queue[position - 1] : null}
                        nextId={
                          position >= 0 && position < queue.length - 1
                            ? queue[position + 1]
                            : null
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

function statusIcon(game: PlannedGame) {
  if (game.finished) return "✅";
  if (game.item.status === "playing") return "▶";
  return "";
}

function plannedMeta(game: PlannedGame) {
  const platform = game.item.my_platform
    ? MY_PLATFORM_LABELS[game.item.my_platform]
    : null;
  if (game.finished) return [platform, "zerado"].filter(Boolean).join(" · ");
  if (game.hoursThisMonth === null) {
    return [platform, "⚠ sem estimativa"].filter(Boolean).join(" · ");
  }
  return [
    platform,
    `~${Math.round(game.hoursThisMonth)} h neste mês`,
    game.startedBefore ? "continua" : null,
    game.endsThisMonth ? "termina aqui" : "segue no próximo",
  ]
    .filter(Boolean)
    .join(" · ");
}

function gameMeta(item: BacklogItem) {
  const hours = estimateHours(item);
  return [
    item.status === "playing" ? "Jogando" : null,
    item.my_platform ? MY_PLATFORM_LABELS[item.my_platform] : null,
    hours
      ? `~${hours} h${item.my_estimate_hours ? " (minha)" : ""}`
      : "sem estimativa",
  ]
    .filter(Boolean)
    .join(" · ");
}

function Cover({ item }: { item: BacklogItem }) {
  return (
    <div className="relative aspect-[4/3] w-14 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
      {item.cover_url && (
        <Image
          src={item.cover_url}
          alt=""
          fill
          sizes="56px"
          unoptimized
          className="object-cover"
        />
      )}
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      {children}
    </p>
  );
}
