"use client";

import { useActionState } from "react";
import { createProfile, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export function UsernameForm() {
  const [state, formAction, pending] = useActionState(
    createProfile,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="username" className="text-sm font-medium">
        Nome de usuário
      </label>
      <div className="flex h-12 items-center rounded-lg border border-zinc-300 px-3 focus-within:border-zinc-900 dark:border-zinc-700 dark:focus-within:border-zinc-100">
        <span className="text-zinc-500">@</span>
        <input
          id="username"
          name="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_]{3,20}"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          defaultValue={state.username}
          placeholder="seu_nome"
          className="h-full flex-1 bg-transparent pl-1 text-base outline-none"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Letras minúsculas, números e _.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-zinc-900 font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Salvando…" : "Continuar"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
