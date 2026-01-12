"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCase, fetchCases, type CaseItem } from "@/api/cases";
import { fetchBenefits, type BenefitItem } from "@/api/benefits";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-bold">Справи</h1>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{extractErrorMessage(error)}</p>
      ) : null}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Створити справу</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="benefit">Пільга</Label>
              <select
                id="benefit"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={benefitId}
                onChange={(e) => setBenefitId(e.target.value ? Number(e.target.value) : "")}
                disabled={(benefitsQ.data?.length ?? 0) === 0}
              >
                {(benefitsQ.data?.length ?? 0) === 0 ? (
                  <option value="">Немає доступних пільг</option>
                ) : (
                  benefitsQ.data!.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (id: {b.id})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Назва</Label>
              <Input
                id="title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Напр. Компенсація проїзду"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Опис (необов’язково)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Короткий опис..."
              />
            </div>

            <Button
              type="submit"
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

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Список</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Завантаження...</p>
          ) : (casesQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Поки немає справ</p>
          ) : (
            <ul className="list-disc pl-5 space-y-2">
              {casesQ.data!.map((c: CaseItem) => {
                const caseTitle = c.title?.trim() ? c.title : "Без назви";
                const benefitTitle = benefitsMap.get(c.benefit_id)?.title ?? `Пільга #${c.benefit_id}`;

                return (
                  <li key={c.id} className="text-sm">
                    <Link href={`/cases/${c.id}`} className="text-blue-600 hover:underline">
                      {caseTitle}
                    </Link>
                    <span className="text-muted-foreground"> — {c.status}</span>
                    <span className="text-muted-foreground"> — {benefitTitle}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
