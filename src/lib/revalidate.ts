import { revalidatePath } from "next/cache";

// Pages that show backlog items. The browser keeps copies of visited and
// prefetched pages; after any backlog change, mark these copies as stale
// so the next visit fetches fresh data. Call only from Server Actions.
export function revalidateBacklogPages() {
  revalidatePath("/backlog");
  revalidatePath("/hoje");
  revalidatePath("/amigos");
  revalidatePath("/u/[username]", "page");
}
