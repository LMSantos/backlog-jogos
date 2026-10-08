import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { GameTile } from "@/components/game-tile";
import { RawgCredit } from "@/components/rawg-credit";
import { getUserId, type Profile } from "@/lib/auth";
import {
  BACKLOG_ITEM_COLUMNS,
  PRIORITY_LABELS,
  type BacklogItem,
} from "@/lib/backlog";
import { computeStats, type BacklogStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Perfil | Backlog de Jogos",
};

export default function ProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      {/* The username is only known at request time (runtime param). */}
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        {params.then(({ username }) => (
          <ProfileContent username={username} />
        ))}
      </Suspense>

      <RawgCredit />
    </main>
  );
}

async function ProfileContent({ username }: { username: string }) {
  // RLS only lets logged-in users read profiles and backlogs.
  const viewerId = await getUserId();
  if (!viewerId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, steam_id")
    .eq("username", decodeURIComponent(username).toLowerCase())
    .maybeSingle<Profile & { steam_id: string | null }>();
  if (!profile) notFound();

  const { data } = await supabase
    .from("backlog_items")
    .select(BACKLOG_ITEM_COLUMNS)
    .eq("user_id", profile.id);
  const items = (data ?? []) as BacklogItem[];

  const name = profile.display_name ?? profile.username;
  const isMe = profile.id === viewerId;
  const stats = computeStats(items, new Date());

  const playing = items
    .filter((item) => item.status === "playing")
    .sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""));
  const backlog = items
    .filter((item) => item.status === "backlog")
    .sort(
      (a, b) =>
        a.priority - b.priority || b.created_at.localeCompare(a.created_at),
    );
  const finished = items
    .filter((item) => item.status === "finished")
    .sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""));
  const dropped = items.filter((item) => item.status === "dropped");

  return (
    <>
      <header className="flex items-center gap-4">
        <Avatar name={name} url={profile.avatar_url} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {name}
          </h1>
          <p className="text-zinc-500">
            @{profile.username}
            {profile.steam_id && (
              <>
                {" · "}
                <a
                  href={`https://steamcommunity.com/profiles/${profile.steam_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Steam ↗
                </a>
              </>
            )}
          </p>
        </div>
        {isMe && (
          <div className="flex shrink-0 flex-col items-end gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/backlog" className="underline underline-offset-4">
              Editar
            </Link>
            <Link href="/conta" className="underline underline-offset-4">
              Conta
            </Link>
          </div>
        )}
      </header>

      <StatsTiles stats={stats} />

      <Section title="🎮 Jogando agora" items={playing} empty="Nada em andamento.">
        {(item) => (item.avg_playtime_hours ? `~${item.avg_playtime_hours} h` : undefined)}
      </Section>

      <Section title="Backlog" items={backlog} empty="Backlog vazio.">
        {(item) =>
          [
            `Prioridade ${PRIORITY_LABELS[item.priority].toLowerCase()}`,
            item.avg_playtime_hours ? `~${item.avg_playtime_hours} h` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        }
      </Section>

      <Section title="🏆 Zerados" items={finished} empty="Nenhum zerado ainda.">
        {(item) => (item.rating ? `★ ${item.rating}/10` : undefined)}
      </Section>

      {dropped.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-lg font-semibold">
            Abandonados · {dropped.length}
          </summary>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {dropped.map((item) => (
              <GameTile key={item.id} item={item} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function StatsTiles({ stats }: { stats: BacklogStats }) {
  const tiles = [
    { value: stats.backlogCount, label: "no backlog" },
    { value: stats.finishedThisYear, label: `zerados em ${stats.year}` },
    {
      value: `~${stats.hoursToFinish} h`,
      label: "para zerar tudo",
      note:
        stats.unknownDurationCount > 0
          ? `+${stats.unknownDurationCount} sem duração`
          : undefined,
    },
  ];

  return (
    <dl className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <dd className="order-1 text-2xl font-semibold tabular-nums">
            {tile.value}
          </dd>
          <dt className="order-2 text-xs text-zinc-500">{tile.label}</dt>
          {tile.note && (
            <dd className="order-3 text-xs text-zinc-400">{tile.note}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}

function Section({
  title,
  items,
  empty,
  children: detail,
}: {
  title: string;
  items: BacklogItem[];
  empty: string;
  children: (item: BacklogItem) => string | undefined;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {title} · {items.length}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <GameTile key={item.id} item={item} detail={detail(item)} />
          ))}
        </ul>
      )}
    </section>
  );
}
