import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { getProfile, getUserId, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Amigos | Backlog de Jogos",
};

export default function FriendsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Amigos</h1>

      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
        <FriendsList />
      </Suspense>
    </main>
  );
}

async function FriendsList() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (!(await getProfile())) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: profiles }, { data: playing }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .order("username"),
    supabase
      .from("backlog_items")
      .select("user_id, title")
      .eq("status", "playing")
      .order("started_at", { ascending: false }),
  ]);

  const playingByUser = new Map<string, string[]>();
  for (const row of playing ?? []) {
    const titles = playingByUser.get(row.user_id) ?? [];
    titles.push(row.title);
    playingByUser.set(row.user_id, titles);
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
      {((profiles ?? []) as Profile[]).map((profile) => {
        const name = profile.display_name ?? profile.username;
        const titles = playingByUser.get(profile.id);
        return (
          <li key={profile.id}>
            <Link
              href={`/u/${profile.username}`}
              className="flex items-center gap-3 py-3"
            >
              <Avatar name={name} url={profile.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {name}{" "}
                  <span className="font-normal text-zinc-500">
                    @{profile.username}
                    {profile.id === userId && " (você)"}
                  </span>
                </p>
                <p className="truncate text-sm text-zinc-500">
                  {titles
                    ? `🎮 Jogando: ${titles.join(", ")}`
                    : "Nada em andamento"}
                </p>
              </div>
              <span aria-hidden="true" className="text-zinc-400">
                ›
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
