import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { RawgCredit } from "@/components/rawg-credit";
import { getUserId } from "@/lib/auth";
import { getOwnedGames, type SteamOwnedGame } from "@/lib/steam";
import { createClient } from "@/lib/supabase/server";
import { ImportList } from "./import-list";

export const metadata: Metadata = {
  title: "Importar da Steam | Backlog de Jogos",
};

const PRIVACY_SETTINGS_URL = "https://steamcommunity.com/my/edit/settings";

export default function ImportPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Importar da Steam
        </h1>
        <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/backlog" className="underline underline-offset-4">
            Meu backlog
          </Link>
          <Link href="/" className="underline underline-offset-4">
            Início
          </Link>
        </nav>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-zinc-500">Carregando sua biblioteca…</p>
        }
      >
        <ImportLoader />
      </Suspense>

      <RawgCredit />
    </main>
  );
}

async function ImportLoader() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("steam_id")
    .eq("id", userId)
    .maybeSingle<{ steam_id: string | null }>();
  if (!profile) redirect("/onboarding");

  if (!profile.steam_id) {
    return (
      <Notice>
        Vincule sua conta Steam para importar a biblioteca.{" "}
        <Link href="/conta" className="underline underline-offset-2">
          Ir para Minha conta
        </Link>
      </Notice>
    );
  }

  let games: SteamOwnedGame[] | null;
  try {
    games = await getOwnedGames(profile.steam_id);
  } catch {
    return (
      <Notice>
        A Steam não respondeu agora. Atualize a página daqui a pouco.
      </Notice>
    );
  }

  if (!games) {
    return (
      <Notice>
        Sua biblioteca Steam está privada. Em{" "}
        <a
          href={PRIVACY_SETTINGS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Configurações de privacidade da Steam
        </a>
        , deixe <strong>Perfil</strong> e <strong>Detalhes do jogo</strong>{" "}
        como Público e atualize esta página.
      </Notice>
    );
  }

  const { data: imported } = await supabase
    .from("backlog_items")
    .select("steam_app_id")
    .eq("user_id", userId)
    .not("steam_app_id", "is", null);

  // Demos don't belong in a backlog. Most played first.
  const library = games
    .filter((game) => !/\bdemo\b/i.test(game.name))
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);

  return (
    <ImportList
      games={library}
      importedIds={(imported ?? []).map(
        (row) => row.steam_app_id as number,
      )}
    />
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      {children}
    </p>
  );
}
