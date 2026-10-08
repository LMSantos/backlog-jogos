// Runs `task` over `items` with at most `limit` running at the same time,
// to stay friendly with external APIs (RAWG, Steam).
export async function forEachLimited<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        await task(item);
      }
    }),
  );
}
