import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./button-styles";
import { ICONS, type IconName } from "./icons";

// A link that looks like an outlined button. Use it for actions that
// navigate (e.g. "Editar", "Importar"). Real <button>s use buttonClass().
export function ButtonLink({
  href,
  icon,
  variant,
  children,
}: {
  href: string;
  icon?: IconName;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass({ variant })}>
      {icon && ICONS[icon]}
      {children}
    </Link>
  );
}
