import { revalidatePath } from "next/cache";

// The browser keeps copies of visited and prefetched pages. After a change,
// mark the copies that show the changed data as stale so the next visit
// fetches fresh data. Call only from Server Actions or Route Handlers.

// Pages that show backlog items.
export function revalidateBacklogPages() {
  revalidatePath("/backlog");
  revalidatePath("/hoje");
  revalidatePath("/plano");
  revalidatePath("/perfil");
  revalidatePath("/jogo/[id]", "page");
}

// Pages that show profile data such as linked accounts.
export function revalidateProfilePages() {
  revalidatePath("/conta");
  revalidatePath("/perfil");
}
