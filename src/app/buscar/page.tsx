import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getProfile, getUserId } from "@/lib/auth";
import { GameSearch } from "./game-search";

export const metadata: Metadata = {
  title: "Buscar jogos | Backlog de Jogos",
};

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Buscar jogos</h1>
        <Link
          href="/"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          Início
        </Link>
      </header>

      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        <SearchGate />
      </Suspense>

      {/* Attribution required by the RAWG API terms of use. */}
      <footer className="mt-auto pt-6 text-center text-xs text-zinc-500">
        Dados por{" "}
        <a
          href="https://rawg.io"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          RAWG
        </a>
      </footer>
    </main>
  );
}

async function SearchGate() {
  if (!(await getUserId())) redirect("/login");
  if (!(await getProfile())) redirect("/onboarding");
  return <GameSearch />;
}
