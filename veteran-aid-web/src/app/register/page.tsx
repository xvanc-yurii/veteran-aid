"use client";

import Link from "next/link";
import { useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { register, type RegisterPayload } from "@/api/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiDetailItem = { msg?: string };
type ApiErrorPayload = { detail?: string | ApiDetailItem[] };

function getAxiosDetail(e: unknown): string | null {
  if (!axios.isAxiosError(e)) return null;

  const data = e.response?.data;
  if (typeof data === "object" && data !== null) {
    const payload = data as ApiErrorPayload;

    if (typeof payload.detail === "string") return payload.detail;

    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((x) => (typeof x?.msg === "string" ? x.msg : ""))
        .filter(Boolean)
        .join(", ");
    }
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [region, setRegion] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: () => {
      setError(null);
      setOk("Акаунт створено. Тепер увійди.");
      // невелика пауза не потрібна — одразу на логін
      router.push("/login");
    },
    onError: (e) => {
      setOk(null);
      setError(getAxiosDetail(e) ?? "Не вдалося зареєструватися");
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);

    const em = email.trim().toLowerCase();
    const fn = fullName.trim();
    const rg = region.trim();

    if (!em || !password) {
      setError("Вкажи email та пароль.");
      return;
    }
    if (password.length < 6) {
      setError("Пароль має бути мінімум 6 символів.");
      return;
    }
    if (password !== password2) {
      setError("Паролі не співпадають.");
      return;
    }

    // Якщо бек поки приймає тільки email/password — просто прибери full_name/region
    m.mutate({
      email: em,
      password,
      full_name: fn || undefined,
      region: rg || undefined,
    });
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Реєстрація</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {ok && <p className="text-sm text-green-600">{ok}</p>}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Ел. пошта</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">ПІБ</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Іванченко Юрій Юрійович"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Регіон</Label>
              <Input
                id="region"
                type="text"
                placeholder="Запорізька область"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password2">Повтори пароль</Label>
              <Input
                id="password2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={m.isPending}>
              {m.isPending ? "Створюю акаунт…" : "Зареєструватися"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Вже є акаунт?{" "}
            <Link className="underline" href="/login">
              Увійти
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
