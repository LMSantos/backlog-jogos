import type { Metadata } from "next";
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
      <h1 className="text-2xl font-semibold tracking-tight">Buscar jogos</h1>

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
