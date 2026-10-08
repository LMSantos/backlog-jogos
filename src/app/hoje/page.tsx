import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RawgCredit } from "@/components/rawg-credit";
import { getProfile, getUserId } from "@/lib/auth";
import { BACKLOG_ITEM_COLUMNS, type BacklogItem } from "@/lib/backlog";
import { createClient } from "@/lib/supabase/server";
import { TodayPicker } from "./today-picker";

export const metadata: Metadata = {
  title: "O que jogo hoje? | Backlog de Jogos",
};

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          O que jogo hoje?
        </h1>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/backlog" className="underline underline-offset-4">
            Meu backlog
          </Link>
          <Link href="/" className="underline underline-offset-4">
            Início
          </Link>
        </nav>
      </header>

      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        <TodayLoader />
      </Suspense>

      <RawgCredit />
    </main>
  );
}

async function TodayLoader() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (!(await getProfile())) redirect("/onboarding");

  // Only games that can still be played are candidates.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("backlog_items")
    .select(BACKLOG_ITEM_COLUMNS)
    .eq("user_id", userId)
    .in("status", ["backlog", "playing"]);

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Não foi possível carregar seus jogos. Atualize a página para tentar de
        novo.
      </p>
    );
  }

  return <TodayPicker initialItems={(data ?? []) as BacklogItem[]} />;
}
