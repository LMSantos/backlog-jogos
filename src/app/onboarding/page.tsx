import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getProfile, getUserId } from "@/lib/auth";
import { UsernameForm } from "./username-form";

export const metadata: Metadata = {
  title: "Bem-vindo | Backlog de Jogos",
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo! 🎮</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Escolha um nome de usuário para sua conta.
        </p>
      </div>
      <Suspense fallback={<p className="text-center text-sm">Carregando…</p>}>
        <OnboardingGate />
      </Suspense>
    </main>
  );
}

async function OnboardingGate() {
  if (!(await getUserId())) redirect("/login");
  if (await getProfile()) redirect("/backlog");
  return <UsernameForm />;
}
