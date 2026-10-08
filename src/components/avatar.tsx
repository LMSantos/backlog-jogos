import Image from "next/image";

// Profile picture (from Google) or the first letter of the name.
export function Avatar({
  name,
  url,
  size = 48,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        unoptimized
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
    >
      {name.charAt(0)}
    </span>
  );
}
