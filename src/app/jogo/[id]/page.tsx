import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ButtonLink } from "@/components/button-link";
import { ProgressBar } from "@/components/progress-bar";
import { RawgCredit } from "@/components/rawg-credit";
import { getUserId } from "@/lib/auth";
import {
  BACKLOG_ITEM_COLUMNS,
  MY_PLATFORM_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type BacklogItem,
} from "@/lib/backlog";
import { getGameDetails, type GameDetails } from "@/lib/rawg";
import { createClient } from "@/lib/supabase/server";
import { NotesEditor } from "./notes-editor";

export const metadata: Metadata = {
  title: "Jogo | Backlog de Jogos",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function GamePage({ params }: PageProps<"/jogo/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <Link
        href="/backlog"
        className="self-start text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
      >
        ← Meu backlog
      </Link>

      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        {params.then(({ id }) => (
          <GameContent itemId={id} />
        ))}
      </Suspense>

      <RawgCredit />
    </main>
  );
}

async function GameContent({ itemId }: { itemId: string }) {
  if (!UUID_PATTERN.test(itemId)) notFound();

  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  // RLS only returns the user's own games, so another user's id is a 404.
  const [{ data }, { data: progress }] = await Promise.all([
    supabase
      .from("backlog_items")
      .select(BACKLOG_ITEM_COLUMNS)
      .eq("id", itemId)
      .maybeSingle(),
    supabase
      .from("steam_achievement_progress")
      .select("steam_app_id, unlocked, total"),
  ]);
  if (!data) notFound();
  const item = data as BacklogItem;
  const achievements = progress?.find(
    (row) => row.steam_app_id === item.steam_app_id,
  );

  // RAWG extras are a bonus: the page still works if RAWG is down.
  let details: GameDetails | null = null;
  try {
    details = await getGameDetails(item.rawg_id);
  } catch {
    details = null;
  }

  const summary = [
    STATUS_LABELS[item.status],
    item.my_platform ? MY_PLATFORM_LABELS[item.my_platform] : null,
    `Prioridade ${PRIORITY_LABELS[item.priority].toLowerCase()}`,
    item.rating ? `★ ${item.rating}/10` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
          {item.cover_url && (
            <Image
              src={item.cover_url}
              alt=""
              fill
              sizes="(min-width: 640px) 640px, 100vw"
              unoptimized
              className="object-cover"
            />
          )}
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          {item.title}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
        <div className="self-start">
          <ButtonLink href="/backlog" icon="edit">
            Editar no backlog
          </ButtonLink>
        </div>
      </header>

      <Section title="📝 Meu comentário">
        <p className="text-sm text-zinc-500">
          {item.status === "finished" && item.finished_at
            ? `Zerado em ${dateFormat.format(new Date(item.finished_at))}. `
            : item.started_at
              ? `Começou em ${dateFormat.format(new Date(item.started_at))}. `
              : ""}
          Só você vê este comentário.
        </p>
        {/* key: start fresh when navigating from one game to another. */}
        <NotesEditor key={item.id} itemId={item.id} initialNotes={item.notes} />
      </Section>

      {(item.steam_playtime_minutes || achievements) && (
        <Section title="Steam">
          {!!item.steam_playtime_minutes && (
            <p className="text-sm">
              {Math.max(1, Math.round(item.steam_playtime_minutes / 60))} h
              jogadas na Steam
            </p>
          )}
          {item.steam_app_id !== null && achievements?.total !== 0 && (
            <Link
              href={`/conquistas/${item.steam_app_id}`}
              className="flex flex-col gap-1 text-sm underline-offset-2 hover:underline"
            >
              {achievements ? (
                <ProgressBar
                  value={achievements.unlocked}
                  total={achievements.total}
                />
              ) : null}
              <span>🏆 Ver conquistas</span>
            </Link>
          )}
        </Section>
      )}

      <Section title="Sobre o jogo">
        {details ? <AboutGame item={item} details={details} /> : (
          <p className="text-sm text-zinc-500">
            Não foi possível carregar os detalhes da RAWG agora.
          </p>
        )}
      </Section>
    </>
  );
}

function AboutGame({
  item,
  details,
}: {
  item: BacklogItem;
  details: GameDetails;
}) {
  const facts: [string, string][] = [];
  if (details.developers.length)
    facts.push(["Desenvolvedora", details.developers.join(", ")]);
  if (details.publishers.length)
    facts.push(["Publicadora", details.publishers.join(", ")]);
  if (details.released)
    facts.push([
      "Lançamento",
      dateFormat.format(new Date(`${details.released}T12:00:00Z`)),
    ]);
  if (item.avg_playtime_hours)
    facts.push(["Tempo médio", `~${item.avg_playtime_hours} h`]);
  if (item.genres.length) facts.push(["Gêneros", item.genres.join(", ")]);
  if (item.platforms.length)
    facts.push(["Disponível em", item.platforms.join(", ")]);

  const paragraphs =
    details.description?.split(/\r?\n\s*\r?\n/).filter((p) => p.trim()) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {facts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-zinc-500">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {details.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {details.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      {paragraphs.length > 0 && (
        <details className="group text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <summary className="cursor-pointer font-medium text-zinc-900 dark:text-zinc-100">
            Descrição (em inglês)
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </details>
      )}

      {details.website && (
        <a
          href={details.website}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm underline underline-offset-2"
        >
          Site oficial ↗
        </a>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
