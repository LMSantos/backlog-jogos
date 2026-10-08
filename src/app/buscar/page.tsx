import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RawgCredit } from "@/components/rawg-credit";
import { getProfile, getUserId } from "@/lib/auth";
import { GameSearch } from "./game-search";

export const metadata: Metadata = {
  title: "Buscar jogos | Backlog de Jogos",
};

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Buscar jogos</h1>
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
        <SearchGate />
      </Suspense>

      <RawgCredit />
    </main>
  );
}

async function SearchGate() {
  if (!(await getUserId())) redirect("/login");
  if (!(await getProfile())) redirect("/onboarding");
  return <GameSearch />;
}
