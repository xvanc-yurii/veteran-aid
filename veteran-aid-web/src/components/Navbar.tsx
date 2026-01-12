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
              Cases
            </Link>
            <Link className="hover:underline" href="/benefits">
              Benefits
            </Link>
          </nav>
        </div>

        <div>
          {token ? (
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
