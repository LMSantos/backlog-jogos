import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | Backlog de Jogos",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sem senha: enviamos um link para o seu e-mail.
        </p>
      </div>
      {/* LoginForm reads ?error= from the URL, which is request-time data. */}
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-xs text-zinc-500">
        Ao entrar, você concorda com a{" "}
        <Link href="/privacidade" className="underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </p>
    </main>
  );
}
