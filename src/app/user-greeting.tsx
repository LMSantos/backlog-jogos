import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { getProfile, getUserId } from "@/lib/auth";

export async function UserGreeting() {
  if (!(await getUserId())) {
    return (
      <Link
        href="/login"
        className="flex h-12 items-center rounded-lg bg-zinc-900 px-6 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Entrar
      </Link>
    );
  }

  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-lg">
        Olá, <strong>{profile.display_name ?? profile.username}</strong>!{" "}
        <span className="text-zinc-500">@{profile.username}</span>
      </p>
      <Link
        href="/hoje"
        className="flex h-14 w-full max-w-xs items-center justify-center rounded-lg bg-zinc-900 px-6 text-lg font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        O que jogo hoje? 🎲
      </Link>
      <div className="flex gap-3">
        <Link
          href="/backlog"
          className="flex h-12 items-center rounded-lg border border-zinc-300 px-6 font-medium dark:border-zinc-700"
        >
          Meu backlog
        </Link>
        <Link
          href="/buscar"
          className="flex h-12 items-center rounded-lg border border-zinc-300 px-6 font-medium dark:border-zinc-700"
        >
          Buscar jogos
        </Link>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
