"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { fetchCaseById, fetchCaseProgress, type CaseItem } from "@/api/cases";
import { fetchBenefits, type BenefitItem } from "@/api/benefits";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("uk-UA");
}

export default function CaseDetailsPage() {
  const params = useParams<{ id: string }>();

  const caseId = useMemo(() => {
    const raw = params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params?.id]);

  const caseQ = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fetchCaseById(caseId as number),
    enabled: caseId !== null,
  });

  const benefitsQ = useQuery({
    queryKey: ["benefits"],
    queryFn: fetchBenefits,
  });

  const progressQ = useQuery({
    queryKey: ["case-progress", caseId],
    queryFn: () => fetchCaseProgress(caseId as number),
    enabled: caseId !== null,
  });

  if (caseId === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-3">
        <p className="text-red-600">Некоректний id справи.</p>
        <Link href="/cases" className="text-sm underline">
          ← Назад до справ
        </Link>
      </main>
    );
  }

  if (caseQ.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p>Завантаження…</p>
      </main>
    );
  }

  if (caseQ.isError || !caseQ.data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-3">
        <p className="text-red-600">Не вдалося завантажити справу.</p>
        <Link href="/cases" className="text-sm underline">
          ← Назад до справ
        </Link>
      </main>
    );
  }

  const item: CaseItem = caseQ.data;

  const benefits: BenefitItem[] = benefitsQ.data ?? [];
  const benefitTitle =
    benefits.find((b) => b.id === item.benefit_id)?.title ?? `ID: ${item.benefit_id}`;

  const title = item.title?.trim() ? item.title.trim() : "Без назви";
  const description = item.description?.trim() ? item.description.trim() : "Опис відсутній";

  const progress = progressQ.data;

  const progressStateText =
    progress?.is_ready_for_approval
      ? "Готово до схвалення"
      : progress?.is_ready_to_submit
      ? "Готово до подачі"
      : "Збір документів";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <Link href="/cases" className="text-sm underline">
        ← Назад до справ
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-semibold">Статус:</span> {statusUa(item.status)}
          </div>

          <div>
            <span className="font-semibold">Пільга:</span> {benefitTitle}
          </div>

          <div>
            <span className="font-semibold">Опис:</span> {description}
          </div>

          <div>
            <span className="font-semibold">Створено:</span> {formatDate(item.created_at)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Прогрес справи</CardTitle>
        </CardHeader>

        <CardContent className="text-sm">
          {progressQ.isLoading ? (
            <p className="text-muted-foreground">Завантаження прогресу…</p>
          ) : progressQ.isError || !progress ? (
            <p className="text-red-600">Не вдалося завантажити прогрес.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{progressStateText}</span>
                <span className="text-muted-foreground">{progress.percent}%</span>
              </div>

              <Progress value={progress.percent} />

              <div className="text-muted-foreground">
                Документи: {progress.approved + progress.uploaded} з {progress.total} • Потрібні:{" "}
                {progress.required}
                {progress.rejected > 0 ? <> • Відхилені: {progress.rejected}</> : null}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <span className="font-semibold">Всього:</span> {progress.total}
                </div>
                <div>
                  <span className="font-semibold">Потрібні:</span> {progress.required}
                </div>
                <div>
                  <span className="font-semibold">Завантажені:</span> {progress.uploaded}
                </div>
                <div>
                  <span className="font-semibold">Схвалені:</span> {progress.approved}
                </div>
                <div>
                  <span className="font-semibold">Відхилені:</span> {progress.rejected}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
