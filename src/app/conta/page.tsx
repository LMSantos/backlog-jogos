import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { getUserId } from "@/lib/auth";
import { getSteamPlayer, type SteamPlayer } from "@/lib/steam";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { unlinkSteam } from "./actions";

export const metadata: Metadata = {
  title: "Minha conta | Backlog de Jogos",
};

const MESSAGES: Record<string, { kind: "ok" | "error"; text: string }> = {
  vinculada: { kind: "ok", text: "Conta Steam vinculada!" },
  desvinculada: { kind: "ok", text: "Conta Steam desvinculada." },
  "em-uso": {
    kind: "error",
    text: "Essa conta Steam já está vinculada a outro usuário do app.",
  },
  erro: {
    kind: "error",
    text: "Não foi possível vincular a Steam. Tente de novo.",
  },
};

export default function AccountPage({ searchParams }: PageProps<"/conta">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>

      {/* The message comes from ?steam=… (request-time URL data). */}
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        {searchParams.then(({ steam }) => (
          <AccountContent message={typeof steam === "string" ? steam : null} />
        ))}
      </Suspense>
    </main>
  );
}

async function AccountContent({ message }: { message: string | null }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, steam_id")
    .eq("id", userId)
    .maybeSingle<{ username: string; steam_id: string | null }>();
  if (!profile) redirect("/onboarding");

  let player: SteamPlayer | null = null;
  let steamUnavailable = false;
  if (profile.steam_id) {
    try {
      player = await getSteamPlayer(profile.steam_id);
    } catch {
      steamUnavailable = true;
    }
  }

  const notice = message ? MESSAGES[message] : undefined;

  return (
    <>
      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`rounded-lg p-3 text-sm ${
            notice.kind === "error"
              ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
              : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
          }`}
        >
          {notice.text}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Steam</h2>

        {!profile.steam_id ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vincule sua conta Steam para importar sua biblioteca e ver suas
              conquistas. Você entra pela própria Steam: o app nunca vê sua
              senha.
            </p>
            {/* Plain <a>: this route redirects to Steam, so no prefetch. */}
            <a
              href="/auth/steam/start"
              className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-6 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Vincular Steam
            </a>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Avatar
                name={player?.personaName ?? "Steam"}
                url={player?.avatarUrl ?? null}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {player?.personaName ?? "Conta Steam vinculada"}
                </p>
                <a
                  href={
                    player?.profileUrl ??
                    `https://steamcommunity.com/profiles/${profile.steam_id}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 underline underline-offset-2"
                >
                  Ver perfil na Steam
                </a>
              </div>
            </div>

            {steamUnavailable && (
              <p className="text-sm text-zinc-500">
                A Steam não respondeu agora; os dados do perfil aparecem
                quando ela voltar.
              </p>
            )}

            <p
              className={`text-sm ${
                player && !player.isPublic
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-zinc-500"
              }`}
            >
              {player && !player.isPublic
                ? "⚠️ Seu perfil Steam está privado. "
                : "Lembrete: "}
              para o app ler sua biblioteca e conquistas, deixe{" "}
              <strong>Perfil</strong> e <strong>Detalhes do jogo</strong> como
              Público em{" "}
              <a
                href="https://steamcommunity.com/my/edit/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Configurações de privacidade da Steam
              </a>
              .
            </p>

            <Link
              href="/importar"
              className="flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-6 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Importar biblioteca
            </Link>

            <form action={unlinkSteam}>
              <button
                type="submit"
                className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
              >
                Desvincular Steam
              </button>
            </form>
          </>
        )}
      </section>

      <div className="flex items-center justify-between gap-4">
        <Link href={`/u/${profile.username}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
          Ver meu perfil
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </>
  );
}
