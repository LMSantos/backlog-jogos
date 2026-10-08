import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RawgCredit } from "@/components/rawg-credit";
import { getProfile, getUserId } from "@/lib/auth";
import {
  BACKLOG_ITEM_COLUMNS,
  type AchievementProgressMap,
  type BacklogItem,
} from "@/lib/backlog";
import { createClient } from "@/lib/supabase/server";
import { BacklogBoard } from "./backlog-board";

export const metadata: Metadata = {
  title: "Meu backlog | Backlog de Jogos",
};

export default function BacklogPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Meu backlog</h1>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/buscar" className="underline underline-offset-4">
            Buscar jogos
          </Link>
          <Link href="/importar" className="underline underline-offset-4">
            Importar
          </Link>
          <Link href="/" className="underline underline-offset-4">
            Início
          </Link>
        </nav>
      </header>

      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        <BacklogLoader />
      </Suspense>

      <RawgCredit />
    </main>
  );
}

async function BacklogLoader() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (!(await getProfile())) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data, error }, { data: progressRows }] = await Promise.all([
    supabase
      .from("backlog_items")
      .select(BACKLOG_ITEM_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("steam_achievement_progress")
      .select("steam_app_id, unlocked, total")
      .eq("user_id", userId),
  ]);

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Não foi possível carregar seu backlog. Atualize a página para tentar de
        novo.
      </p>
    );
  }

  const progress: AchievementProgressMap = {};
  for (const row of progressRows ?? []) {
    progress[row.steam_app_id] = { unlocked: row.unlocked, total: row.total };
  }

  return (
    <BacklogBoard
      initialItems={(data ?? []) as BacklogItem[]}
      progress={progress}
    />
  );
}
