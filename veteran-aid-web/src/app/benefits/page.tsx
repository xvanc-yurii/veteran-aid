"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBenefits } from "@/api/benefits";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BenefitsPage() {
  const q = useQuery({
    queryKey: ["benefits"],
    queryFn: fetchBenefits,
  });

  if (q.isLoading) return <div>Завантаження...</div>;

  if (q.isError) {
    return <div className="text-red-600">Помилка завантаження пільг</div>;
  }

  const benefits = q.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Пільги</h1>

      {benefits.length === 0 ? (
        <Card>
          <CardContent className="py-6">Поки немає пільг</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {benefits.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {b.title} <span className="text-muted-foreground"> (id: {b.id})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {b.description ? (
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Опис відсутній</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
