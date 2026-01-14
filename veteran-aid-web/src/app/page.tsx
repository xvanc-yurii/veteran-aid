"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, FileText, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";

import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: ShieldCheck,
    title: "Зручна подача документів",
    text: "Збирай список необхідних документів по пільзі та завантажуй їх у справу.",
  },
  {
    icon: UploadCloud,
    title: "Контроль статусів",
    text: "Відстежуй: потрібно / завантажено / погоджено / відхилено — все в одному місці.",
  },
  {
    icon: FileText,
    title: "Генерація заяви (PDF)",
    text: "Автоматично формуємо текст заяви й створюємо PDF на основі даних справи.",
  },
  {
    icon: Sparkles,
    title: "AI-помічник",
    text: "Отримай підказки: що підготувати, куди звертатись, що робити далі.",
  },
];

const steps = [
  {
    n: "01",
    title: "Обери пільгу",
    text: "Переглянь доступні соціальні гарантії та обери потрібну.",
  },
  {
    n: "02",
    title: "Створи справу",
    text: "Система сформує список потрібних документів за обраною пільгою.",
  },
  {
    n: "03",
    title: "Завантаж документи",
    text: "Додавай файли, коментарі та оновлюй статуси документів у кілька кліків.",
  },
  {
    n: "04",
    title: "Згенеруй PDF заяви",
    text: "Сформуй заяву та завантаж її у PDF для подачі в органи.",
  },
];

const faq = [
  {
    q: "Чи можна користуватись без реєстрації?",
    a: "Список пільг можна переглядати, але для створення справи та завантаження документів потрібен акаунт.",
  },
  {
    q: "Які формати файлів підтримуються?",
    a: "Зазвичай PDF/JPG/PNG. Бекенд додатково перевіряє тип і розмір файлів при завантаженні.",
  },
  {
    q: "Чи це офіційний державний сервіс?",
    a: "Ні. Це навчальний/дипломний проєкт-демо, який імітує типову логіку подачі справ.",
  },
];

export default function HomePage() {
  const { token } = useAuth();

  const primaryCta = useMemo(() => {
    return token
      ? { href: "/cases", label: "Перейти до справ", variant: "default" as const }
      : { href: "/login", label: "Увійти", variant: "default" as const };
  }, [token]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      {/* HERO */}
      <section className="grid gap-6 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <Badge variant="secondary" className="w-fit">
            Veteran Aid · демо-система
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Допомога ветеранам та їх сімʼям у отриманні соціальних гарантій
          </h1>

          <p className="text-muted-foreground">
            Створюй справи, завантажуй документи, відстежуй статуси та генеруй заяви.
            Усе просто, структуровано та прозоро.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant={primaryCta.variant}>
              <Link href={primaryCta.href} className="flex items-center gap-2">
                {primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link href="/benefits">Переглянути пільги</Link>
            </Button>

            {!token && (
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">Реєстрація</Link>
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Порада: почни з “Пільги”, обери потрібну — далі створюй справу.
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Швидкий старт</CardTitle>
            <CardDescription>
              Типовий сценарій користування системою за 30 секунд.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md border px-2 py-1 text-xs">1</div>
              <div>
                <div className="font-medium">Обери пільгу</div>
                <div className="text-muted-foreground">Відкрий список та знайди потрібну.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md border px-2 py-1 text-xs">2</div>
              <div>
                <div className="font-medium">Створи справу</div>
                <div className="text-muted-foreground">Зʼявиться список документів.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md border px-2 py-1 text-xs">3</div>
              <div>
                <div className="font-medium">Завантаж документи</div>
                <div className="text-muted-foreground">Файли + коментарі + статуси.</div>
              </div>
            </div>

            
          </CardContent>
        </Card>
      </section>

      {/* FEATURES */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Можливості</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="rounded-2xl">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <f.icon className="h-5 w-5" />
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </div>
                <CardDescription className="text-sm">{f.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Як це працює</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((s) => (
            <Card key={s.n} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                    {s.n}
                  </span>
                  <span className="text-base">{s.title}</span>
                </CardTitle>
                <CardDescription>{s.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Швидкі дії</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Перейти до справ</CardTitle>
              <CardDescription>Перегляд, створення та ведення справ.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/cases">Відкрити</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Переглянути пільги</CardTitle>
              <CardDescription>Список гарантій та опис куди звертатись.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/benefits">Відкрити</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Створити справу</CardTitle>
              <CardDescription>
                Стартуй процес з вибором пільги та формуванням документів.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant={token ? "secondary" : "outline"} className="w-full">
                <Link href={token ? "/cases" : "/login"}>
                  {token ? "Перейти до створення" : "Увійти для створення"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">FAQ</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {faq.map((f) => (
            <Card key={f.q} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{f.q}</CardTitle>
                <CardDescription>{f.a}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-4 pb-6 text-xs text-muted-foreground">
        <Separator className="mb-4" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Veteran Aid (demo)</div>
          <div className="flex gap-4">
            <Link href="/benefits" className="hover:underline">
              Пільги
            </Link>
            <Link href="/cases" className="hover:underline">
              Справи
            </Link>
            {!token && (
              <Link href="/login" className="hover:underline">
                Увійти
              </Link>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
