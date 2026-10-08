"use client";

import type { FormEvent } from "react";
import { unlinkSteam } from "./actions";

const CONFIRM_MESSAGE =
  "Desvincular a Steam apaga do app suas horas e conquistas da Steam. " +
  "Seus jogos continuam no backlog. Continuar?";

export function UnlinkSteamButton() {
  function confirmUnlink(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(CONFIRM_MESSAGE)) event.preventDefault();
  }

  return (
    <form action={unlinkSteam} onSubmit={confirmUnlink}>
      <button
        type="submit"
        className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
      >
        Desvincular Steam
      </button>
    </form>
  );
}
