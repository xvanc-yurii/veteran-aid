import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Veteran Aid",
  description: "Система підтримки ветеранів",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body>
        <Providers>
          <header className="border-b">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <div className="flex gap-6 items-center">
                <Link href="/" className="font-semibold">
                  Veteran Aid
                </Link>
                <nav className="flex gap-4 text-sm">
                  <Link href="/cases">Справи</Link>
                  <Link href="/benefits">Пільги</Link>
                </nav>
              </div>
              <Link
                href="/login"
                className="rounded border px-3 py-1 text-sm"
              >
                Вхід
              </Link>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
