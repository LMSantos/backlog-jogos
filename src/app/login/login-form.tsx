"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

const URL_ERRORS: Record<string, string> = {
  link: "Esse link expirou, já foi usado ou foi aberto em outro navegador. Peça um novo e abra o e-mail neste mesmo aparelho.",
  oauth: "Não foi possível entrar com o Google. Tente novamente.",
};

export function LoginForm() {
  const urlError = useSearchParams().get("error");
  const [status, setStatus] = useState<Status>(
    urlError && URL_ERRORS[urlError]
      ? { kind: "error", message: URL_ERRORS[urlError] }
      : { kind: "idle" },
  );

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setStatus({ kind: "sending" });

    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    if (error) {
      setStatus({
        kind: "error",
        message:
          error.status === 429
            ? "Muitas tentativas. Espere alguns minutos e tente de novo."
            : "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      });
      return;
    }
    setStatus({ kind: "sent", email });
  }

  async function handleGoogle() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus({ kind: "error", message: URL_ERRORS.oauth });
    }
  }

  if (status.kind === "sent") {
    return (
      <p className="rounded-lg bg-emerald-50 p-4 text-center text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        Link enviado para <strong>{status.email}</strong>. Abra o e-mail
        neste mesmo aparelho e toque no link para entrar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com"
          className="h-12 rounded-lg border border-zinc-300 bg-transparent px-3 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="h-12 rounded-lg bg-zinc-900 font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status.kind === "sending" ? "Enviando…" : "Enviar link de acesso"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        ou
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="h-12 rounded-lg border border-zinc-300 font-medium dark:border-zinc-700"
      >
        Entrar com Google
      </button>

      {status.kind === "error" && (
        <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {status.message}
        </p>
      )}
    </div>
  );
}
