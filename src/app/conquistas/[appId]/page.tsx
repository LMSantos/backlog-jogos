import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ProgressBar } from "@/components/progress-bar";
import { progressRow, saveProgress } from "@/lib/achievements";
import { getUserId } from "@/lib/auth";
import {
  getAchievementSchema,
  getPlayerAchievements,
  type AchievementInfo,
} from "@/lib/steam";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Conquistas | Backlog de Jogos",
};

const PRIVACY_SETTINGS_URL = "https://steamcommunity.com/my/edit/settings";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function AchievementsPage({
  params,
}: PageProps<"/conquistas/[appId]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <Link href="/backlog" className="self-start text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← Meu backlog
      </Link>

      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        {params.then(({ appId }) => (
          <AchievementsContent appId={Number(appId)} />
        ))}
      </Suspense>

      <p className="mt-auto pt-6 text-center text-xs text-zinc-500">
        Conquistas e raridade: Steam
      </p>
    </main>
  );
}

async function AchievementsContent({ appId }: { appId: number }) {
  if (!Number.isInteger(appId) || appId <= 0) notFound();

  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const [{ data: profile }, { data: item }] = await Promise.all([
    supabase
      .from("profiles")
      .select("steam_id")
      .eq("id", userId)
      .maybeSingle<{ steam_id: string | null }>(),
    supabase
      .from("backlog_items")
      .select("title, cover_url")
      .eq("user_id", userId)
      .eq("steam_app_id", appId)
      .maybeSingle<{ title: string; cover_url: string | null }>(),
  ]);

  if (!profile?.steam_id) {
    return (
      <Notice>
        Vincule sua conta Steam para ver suas conquistas.{" "}
        <Link href="/conta" className="underline underline-offset-2">
          Ir para Minha conta
        </Link>
      </Notice>
    );
  }

  let schema;
  let player;
  try {
    [schema, player] = await Promise.all([
      getAchievementSchema(appId),
      getPlayerAchievements(profile.steam_id, appId),
    ]);
  } catch {
    return <Notice>A Steam não respondeu agora. Atualize a página daqui a pouco.</Notice>;
  }

  const title = item?.title ?? (schema.gameName || "Jogo da Steam");

  if (player.status === "private") {
    return (
      <>
        <GameHeader title={title} coverUrl={item?.cover_url ?? null} />
        <Notice>
          A Steam não mostra suas conquistas porque seu perfil está privado. Em{" "}
          <a
            href={PRIVACY_SETTINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Configurações de privacidade da Steam
          </a>
          , deixe <strong>Meu perfil</strong> e <strong>Detalhes do jogo</strong>{" "}
          como Público e atualize esta página.
        </Notice>
      </>
    );
  }

  // Keep the snapshot used by the backlog cards up to date.
  const row = progressRow(userId, appId, player);
  if (row) {
    await saveProgress([row]).catch((error) =>
      console.error("Achievements page: save failed", appId, String(error)),
    );
  }

  if (player.status === "no-stats" || schema.achievements.length === 0) {
    return (
      <>
        <GameHeader title={title} coverUrl={item?.cover_url ?? null} />
        <Notice>Este jogo não tem conquistas na Steam.</Notice>
      </>
    );
  }

  const unlockedAt = new Map(
    player.achievements
      .filter((entry) => entry.achieved)
      .map((entry) => [entry.apiName, entry.unlockTime]),
  );
  const unlocked = schema.achievements
    .filter((info) => unlockedAt.has(info.apiName))
    .sort(
      (a, b) => (unlockedAt.get(b.apiName) ?? 0) - (unlockedAt.get(a.apiName) ?? 0),
    );
  // Locked ones: most common first, i.e. the easiest to go after next.
  const locked = schema.achievements
    .filter((info) => !unlockedAt.has(info.apiName))
    .sort((a, b) => (b.globalPercent ?? 0) - (a.globalPercent ?? 0));

  return (
    <>
      <GameHeader title={title} coverUrl={item?.cover_url ?? null}>
        <ProgressBar value={unlocked.length} total={schema.achievements.length} />
      </GameHeader>

      <AchievementList
        title={`Desbloqueadas · ${unlocked.length}`}
        achievements={unlocked}
        unlockedAt={unlockedAt}
      />
      <AchievementList
        title={`Faltam · ${locked.length}`}
        achievements={locked}
        unlockedAt={unlockedAt}
      />
    </>
  );
}

function GameHeader({
  title,
  coverUrl,
  children,
}: {
  title: string;
  coverUrl: string | null;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {coverUrl && (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 640px, 100vw"
            unoptimized
            className="object-cover"
          />
        </div>
      )}
      <h1 className="text-2xl font-semibold leading-tight tracking-tight">
        🏆 {title}
      </h1>
      {children}
    </header>
  );
}

function AchievementList({
  title,
  achievements,
  unlockedAt,
}: {
  title: string;
  achievements: AchievementInfo[];
  unlockedAt: Map<string, number | null>;
}) {
  if (achievements.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {achievements.map((info) => {
          const isUnlocked = unlockedAt.has(info.apiName);
          const time = unlockedAt.get(info.apiName);
          // Don't spoil secret achievements before they're unlocked.
          const secret = info.hidden && !isUnlocked;
          return (
            <li key={info.apiName} className="flex items-center gap-3 py-3">
              <Image
                src={isUnlocked ? info.iconUrl : info.iconGrayUrl}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="size-12 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">
                  {secret ? "Conquista secreta" : info.name}
                </p>
                <p className="text-sm text-zinc-500">
                  {secret
                    ? "Continue jogando para descobrir."
                    : (info.description ?? "")}
                </p>
                <p className="text-xs text-zinc-400">
                  {[
                    isUnlocked && time
                      ? `Desbloqueada em ${dateFormat.format(new Date(time * 1000))}`
                      : null,
                    info.globalPercent !== null
                      ? `${info.globalPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos jogadores`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      {children}
    </p>
  );
}
