"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
};

// Simple 24px line icons (stroke follows the text color).
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function tabsFor(username: string): Tab[] {
  const myProfile = `/u/${username}`;
  return [
    {
      href: "/hoje",
      label: "Hoje",
      icon: (
        <Icon>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </Icon>
      ),
      isActive: (path) => path === "/hoje",
    },
    {
      href: "/backlog",
      label: "Backlog",
      icon: (
        <Icon>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </Icon>
      ),
      isActive: (path) =>
        path === "/backlog" ||
        path === "/importar" ||
        path.startsWith("/conquistas/"),
    },
    {
      href: "/buscar",
      label: "Buscar",
      icon: (
        <Icon>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </Icon>
      ),
      isActive: (path) => path === "/buscar",
    },
    {
      href: "/amigos",
      label: "Amigos",
      icon: (
        <Icon>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
          <path d="M18.5 14.5A6.5 6.5 0 0 1 21.5 20" />
        </Icon>
      ),
      isActive: (path) =>
        path === "/amigos" ||
        (path.startsWith("/u/") && path !== myProfile),
    },
    {
      href: myProfile,
      label: "Eu",
      icon: (
        <Icon>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </Icon>
      ),
      isActive: (path) => path === myProfile || path === "/conta",
    },
  ];
}

// Bottom tab bar on phones (easy to reach with the thumb), top bar from
// the sm breakpoint up. Rendered only for logged-in users (see AppNav).
export function NavBar({ username }: { username: string }) {
  const pathname = decodeURI(usePathname());

  return (
    <nav
      data-app-nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:sticky sm:top-0 sm:bottom-auto sm:border-t-0 sm:border-b sm:pb-0 dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="mx-auto flex max-w-4xl items-stretch sm:gap-1 sm:px-4">
        <Link
          href="/"
          className="hidden items-center pr-4 font-semibold tracking-tight sm:flex"
        >
          🎮 Backlog de Jogos
        </Link>
        <ul className="flex flex-1 sm:flex-none">
          {tabsFor(username).map((tab) => {
            const active = tab.isActive(pathname);
            return (
              <li key={tab.href} className="flex-1 sm:flex-none">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium sm:h-14 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
                    active
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center rounded-full px-4 py-0.5 sm:px-0 ${
                      active ? "bg-zinc-200 sm:bg-transparent dark:bg-zinc-800 sm:dark:bg-transparent" : ""
                    }`}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
