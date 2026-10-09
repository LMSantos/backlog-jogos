"use client";

import type { FormEvent } from "react";
import { buttonClass } from "@/components/button-styles";
import { ICONS } from "@/components/icons";
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
      <button type="submit" className={buttonClass({ variant: "danger" })}>
        {ICONS.unlink}
        Desvincular Steam
      </button>
    </form>
  );
}
