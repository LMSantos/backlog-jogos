import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

// Landing page action. Logged-in users normally never get here (proxy.ts
// sends "/" to the backlog); this is the fallback for the same rule.
export async function UserGreeting() {
  if (await getUserId()) redirect("/backlog");

  return (
    <Link
      href="/login"
      className="flex h-12 items-center rounded-lg bg-zinc-900 px-6 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
    >
      Entrar
    </Link>
  );
}
