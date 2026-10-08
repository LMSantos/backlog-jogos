import { Suspense } from "react";
import { UserGreeting } from "./user-greeting";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden="true">
        🎮
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Backlog de Jogos
      </h1>
      <p className="max-w-sm text-base text-zinc-600 dark:text-zinc-400">
        Organize seu backlog e descubra o que jogar hoje.
      </p>
      {/* Reads the session cookie, so it streams in after the static shell. */}
      <Suspense fallback={<div className="h-12" />}>
        <UserGreeting />
      </Suspense>
    </main>
  );
}
