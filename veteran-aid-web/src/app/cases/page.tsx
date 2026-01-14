"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCase, fetchCases, type CaseItem } from "@/api/cases";
import { fetchBenefits, type BenefitItem } from "@/api/benefits";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ApiErrorBody =
  | { detail?: string }
  | { detail?: Array<{ msg?: string }> }
  | undefined;

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    const response = (err as { response?: { data?: unknown; statusText?: string } }).response;
    const data = response?.data as ApiErrorBody;

    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
        ? data.detail.map((x) => x.msg).filter(Boolean).join(", ")
        : null;

    return detail ?? response?.statusText ?? "Запит не вдався";
  }
  return "Запит не вдався";
}

function statusUa(status?: string | null) {
  switch (status) {
    case "draft":
      return "Чернетка";
    case "submitted":
      return "Подано";
    case "in_review":
      return "На розгляді";
    case "approved":
      return "Схвалено";
    case "done":
      return "Завершено";
    default:
      return status ?? "—";
  }
}

export default function CasesPage() {
  const qc = useQueryClient();

  const casesQ = useQuery({
    queryKey: ["cases"],
    queryFn: fetchCases,
  });

  const benefitsQ = useQuery({
    queryKey: ["benefits"],
    queryFn: fetchBenefits,
  });

  const benefitsMap = useMemo(() => {
    const map = new Map<number, BenefitItem>();
    (benefitsQ.data ?? []).forEach((b) => map.set(b.id, b));
    return map;
  }, [benefitsQ.data]);

  const [benefitId, setBenefitId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // якщо пільги підвантажились — проставимо першу, якщо ще не вибрано
  useMemo(() => {
    if (benefitId !== "") return;
    const first = benefitsQ.data?.[0];
    if (first) setBenefitId(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefitsQ.data]);

  const createM = useMutation({
    mutationFn: createCase,
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      await qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });

  const loading = casesQ.isLoading || benefitsQ.isLoading;
  const error = casesQ.error || benefitsQ.error;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (benefitId === "") return;

    createM.mutate({
      benefit_id: benefitId,
      title: title.trim(),
      description: description.trim() ? description.trim() : undefined,
    });
  };

  const list: CaseItem[] = casesQ.data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Справи</h1>
          <p className="text-sm text-muted-foreground">
            Створюй справи по пільгах та відстежуй статуси документів.
          </p>
        </div>

        <div className="text-sm text-muted-foreground">
          Всього: <span className="font-medium text-foreground">{list.length}</span>
        </div>
      </div>

      {error ? (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{extractErrorMessage(error)}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Layout: 2 columns on desktop */}
      <div className="grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
        {/* Create case */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Створити справу</CardTitle>
            <CardDescription>
              Обери пільгу, введи назву — і система створить справу з документами.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="benefit">Пільга</Label>
                <select
                  id="benefit"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={benefitId}
                  onChange={(e) => setBenefitId(e.target.value ? Number(e.target.value) : "")}
                  disabled={(benefitsQ.data?.length ?? 0) === 0}
                >
                  {(benefitsQ.data?.length ?? 0) === 0 ? (
                    <option value="">Немає доступних пільг</option>
                  ) : (
                    benefitsQ.data!.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Назва</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="Напр. Компенсація проїзду"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Опис (необов’язково)</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Короткий опис..."
                  className="min-h-[110px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  createM.isPending ||
                  benefitId === "" ||
                  !title.trim() ||
                  (benefitsQ.data?.length ?? 0) === 0
                }
              >
                {createM.isPending ? "Створюю..." : "Створити справу"}
              </Button>

              {createM.error ? (
                <p className="text-sm text-red-600">{extractErrorMessage(createM.error)}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Список</CardTitle>
            <CardDescription>Натисни на справу, щоб відкрити деталі та документи.</CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Завантаження...</p>
            ) : list.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">Поки немає справ</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Створи першу справу у формі зліва.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {list.map((c: CaseItem) => {
                  const caseTitle = c.title?.trim() ? c.title : "Без назви";
                  const benefitTitle =
                    benefitsMap.get(c.benefit_id)?.title ?? `Пільга #${c.benefit_id}`;

                  return (
                    <div key={c.id} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <Link
                            href={`/cases/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            {caseTitle}
                          </Link>
                          <div className="text-xs text-muted-foreground">{benefitTitle}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{statusUa(c.status)}</Badge>
                          <span className="text-xs text-muted-foreground">ID: {c.id}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
