"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchBenefits, fetchBenefitExplain, type BenefitItem } from "@/api/benefits";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BenefitsPage() {
  const [selectedBenefitId, setSelectedBenefitId] = useState<number | null>(null);

  const benefitsQ = useQuery({
    queryKey: ["benefits"],
    queryFn: fetchBenefits,
  });

  const selectedBenefit = useMemo(() => {
    if (!selectedBenefitId) return null;
    return (benefitsQ.data ?? []).find((b: BenefitItem) => b.id === selectedBenefitId) ?? null;
  }, [benefitsQ.data, selectedBenefitId]);

  const explainQ = useQuery({
    queryKey: ["benefit-explain", selectedBenefitId],
    queryFn: () => fetchBenefitExplain(selectedBenefitId as number),
    enabled: selectedBenefitId !== null,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Пільги</h1>
        <p className="text-sm text-muted-foreground">
          Перелік доступних пільг та пояснення, як отримати.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        {/* список пільг */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Список</CardTitle>
            <CardDescription>Натисни “Пояснення”, щоб підтягнути /explain.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {benefitsQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Завантаження...</p>
            ) : (benefitsQ.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Пільг поки немає</p>
            ) : (
              benefitsQ.data!.map((b: BenefitItem) => (
                <div key={b.id} className="rounded-xl border p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-medium">{b.title}</div>
                    {b.description ? (
                      <div className="text-xs text-muted-foreground">{b.description}</div>
                    ) : null}
                  </div>

                  <Button
                    variant={selectedBenefitId === b.id ? "secondary" : "outline"}
                    onClick={() => setSelectedBenefitId(b.id)}
                  >
                    Пояснення
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* explain panel */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Пояснення</CardTitle>
            <CardDescription>
              {selectedBenefit ? selectedBenefit.title : "Оберіть пільгу зі списку"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedBenefitId === null ? (
              <p className="text-sm text-muted-foreground">Натисни “Пояснення” біля потрібної пільги.</p>
            ) : explainQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Завантаження пояснення...</p>
            ) : explainQ.isError ? (
              <p className="text-sm text-red-600">Не вдалося завантажити пояснення.</p>
            ) : (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {explainQ.data?.explanation ?? "—"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
