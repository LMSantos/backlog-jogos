import Image from "next/image";
import Link from "next/link";
import type { BacklogItem } from "@/lib/backlog";

// Game card (cover + title + a detail line) that opens the game page.
export function GameTile({
  item,
  detail,
}: {
  item: BacklogItem;
  detail?: string;
}) {
  return (
    <li className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <Link href={`/jogo/${item.id}`} className="flex h-full flex-col">
        <div className="relative aspect-video bg-zinc-200 dark:bg-zinc-800">
          {item.cover_url && (
            <Image
              src={item.cover_url}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              unoptimized
              className="object-cover"
            />
          )}
        </div>
        <div className="p-2">
          <p className="line-clamp-2 text-sm font-medium leading-tight">
            {item.title}
          </p>
          {detail && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{detail}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
