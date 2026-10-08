import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Backlog de Jogos",
  description: "Organize seu backlog de jogos e descubra o que jogar hoje.",
};

// "cover" lets the bottom menu use env(safe-area-inset-bottom) on iPhones.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* When the menu is shown, leave room for the fixed bottom bar. */}
      <body className="flex min-h-full flex-col has-[[data-app-nav]]:pb-[calc(4rem+env(safe-area-inset-bottom))] sm:has-[[data-app-nav]]:pb-0">
        {/* Session read: streams in without holding back the page. */}
        <Suspense fallback={null}>
          <AppNav />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
