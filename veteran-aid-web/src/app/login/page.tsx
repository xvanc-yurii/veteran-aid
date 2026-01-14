"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { apiLogin } from "@/api/auth";
import { useAuth } from "@/auth/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FastApiValidationDetailItem = { msg?: string };
type FastApiErrorBody =
  | { detail?: string }
  | { detail?: FastApiValidationDetailItem[] };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("user@admin.com");
  const [password, setPassword] = useState("admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiLogin({ email, password });
      login(data.access_token);
      router.push("/cases");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as FastApiErrorBody | undefined;

        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail.map((x) => x.msg).filter(Boolean).join(", ")
              : null;

        setError(detail ?? err.response?.statusText ?? "Login failed");
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Вхід</CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Ел. пошта</Label>
              <Input
                id="email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@admin.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вхід..." : "Увійти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
