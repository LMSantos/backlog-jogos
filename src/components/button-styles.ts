// Shared look for outlined action buttons and button-like links.
// "danger" is for destructive actions (remove, unlink).
const BASE =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50";

const VARIANTS = {
  secondary:
    "border-zinc-300 text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:active:bg-zinc-700",
  danger:
    "border-red-300 text-red-700 hover:bg-red-50 active:bg-red-100 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950 dark:active:bg-red-900",
};

const SIZES = {
  md: "h-9 px-3 text-sm",
  sm: "h-8 px-2.5 text-xs",
};

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClass({
  variant = "secondary",
  size = "md",
}: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}
