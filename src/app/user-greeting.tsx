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
      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        {[
          { href: "/backlog", label: "Meu backlog" },
          { href: "/buscar", label: "Buscar jogos" },
          { href: "/amigos", label: "Amigos" },
          { href: `/u/${profile.username}`, label: "Meu perfil" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-3 font-medium dark:border-zinc-700"
          >
            {link.label}
          </Link>
        ))}
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
