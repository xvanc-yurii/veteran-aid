"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/useAuth";

export default function Navbar() {
  const { token, logout } = useAuth();

  return (
    <div className="w-full border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Veteran Aid
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link className="hover:underline" href="/cases">
              Справи
            </Link>
            <Link className="hover:underline" href="/benefits">
              Пільги
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {token ? (
            <Button variant="outline" onClick={logout}>
              Вихід
            </Button>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/login">Вхід</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Реєстрація</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
