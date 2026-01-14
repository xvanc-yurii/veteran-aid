"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { VariantProps } from "class-variance-authority";

import { askCaseAI } from "@/api/cases-ai";
import { fetchCaseById, type CaseItem } from "@/api/cases";
import { fetchBenefits, type BenefitItem } from "@/api/benefits";
import {
  fetchCaseDocuments,
  updateCaseDocument,
  uploadCaseDocument,
  getCaseDocumentDownloadUrl,
  type CaseDocumentItem,
  type CaseDocumentStatus,
} from "@/api/case-documents";
import { fetchCaseHistory, type CaseHistoryItem } from "@/api/case-history";
import {
  fetchCaseArtifacts,
  generateApplicationPdf,
  type CaseArtifactItem,
} from "@/api/case-artefacts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function docStatusUa(status: CaseDocumentStatus) {
  switch (status) {
    case "required":
      return "Потрібно";
    case "uploaded":
      return "Завантажено";
    case "approved":
      return "Погоджено";
    case "rejected":
      return "Відхилено";
  }
}

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

function docStatusBadgeVariant(status: CaseDocumentStatus): BadgeVariant {
  switch (status) {
    case "approved":
      return "default";
    case "uploaded":
      return "secondary";
    case "rejected":
      return "destructive";
    case "required":
    default:
      return "outline";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("uk-UA");
}

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "document.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();

  const caseId = useMemo(() => {
    const raw = params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const [docError, setDocError] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  // для красивого file input (щоб не було російського тексту)
  const [pickedFiles, setPickedFiles] = useState<Record<number, string>>({});

  const caseQ = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fetchCaseById(caseId as number),
    enabled: caseId !== null,
  });

  const benefitsQ = useQuery({
    queryKey: ["benefits"],
    queryFn: fetchBenefits,
  });

  const docsQ = useQuery({
    queryKey: ["case-documents", caseId],
    queryFn: () => fetchCaseDocuments(caseId as number),
    enabled: caseId !== null,
  });

  const historyQ = useQuery({
    queryKey: ["case-history", caseId],
    queryFn: () => fetchCaseHistory(caseId as number),
    enabled: caseId !== null,
  });

  const artifactsQ = useQuery({
    queryKey: ["case-artifacts", caseId],
    queryFn: () => fetchCaseArtifacts(caseId as number),
    enabled: caseId !== null,
  });

  const updateDocM = useMutation({
    mutationFn: (payload: {
      docId: number;
      data: { status?: CaseDocumentStatus; comment?: string | null };
    }) => updateCaseDocument(caseId as number, payload.docId, payload.data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["case-history", caseId] });
      await qc.invalidateQueries({ queryKey: ["case-documents", caseId] });
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e) => setDocError(getAxiosDetail(e) ?? "Не вдалося оновити документ"),
  });

  const uploadM = useMutation({
    mutationFn: (p: { docId: number; file: File }) =>
      uploadCaseDocument(caseId as number, p.docId, p.file),
    onSuccess: async (_, vars) => {
      // очистимо обраний файл у UI
      setPickedFiles((prev) => {
        const next = { ...prev };
        delete next[vars.docId];
        return next;
      });

      await qc.invalidateQueries({ queryKey: ["case-history", caseId] });
      await qc.invalidateQueries({ queryKey: ["case-documents", caseId] });
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e) => setDocError(getAxiosDetail(e) ?? "Не вдалося завантажити файл"),
  });

  const pdfM = useMutation({
    mutationFn: () => generateApplicationPdf(caseId as number),
    onSuccess: async (blob) => {
      downloadBlob(blob, `zayava_case_${caseId}.pdf`);
      await qc.invalidateQueries({ queryKey: ["case-artifacts", caseId] });
      await qc.invalidateQueries({ queryKey: ["case-history", caseId] });
    },
    onError: (e) => setDocError(getAxiosDetail(e) ?? "Не вдалося згенерувати PDF"),
  });

  const askAiM = useMutation({
    mutationFn: (q: string) => askCaseAI(caseId as number, q),
    onSuccess: (res) => setAiAnswer(res.answer),
    onError: (e) => {
      setAiAnswer(null);
      setDocError(getAxiosDetail(e) ?? "Не вдалося отримати відповідь від AI");
    },
  });

  if (caseId === null) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-red-600">Некоректний id справи.</p>
        <Link href="/cases" className="text-sm underline">
          ← Назад до справ
        </Link>
      </main>
    );
  }

  if (caseQ.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p>Завантаження…</p>
      </main>
    );
  }

  if (caseQ.isError || !caseQ.data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-red-600">Не вдалося завантажити справу.</p>
        <Link href="/cases" className="text-sm underline">
          ← Назад до справ
        </Link>
      </main>
    );
  }

  const item: CaseItem = caseQ.data;

  const benefits = (benefitsQ.data ?? []) as BenefitItem[];
  const benefitTitle =
    benefits.find((b) => b.id === item.benefit_id)?.title ??
    `ID: ${item.benefit_id}`;

  const title = item.title?.trim() ? item.title.trim() : "Без назви";
  const description = item.description?.trim()
    ? item.description.trim()
    : "Опис відсутній";

  const docs: CaseDocumentItem[] = docsQ.data ?? [];
  const total = docs.length;
  const approved = docs.filter((d) => d.status === "approved").length;
  const uploaded = docs.filter((d) => d.status === "uploaded").length;
  const rejected = docs.filter((d) => d.status === "rejected").length;
  const required = docs.filter((d) => d.status === "required").length;
  const percent = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/cases" className="text-sm underline">
          ← Назад до справ
        </Link>

        <div className="text-sm text-muted-foreground">
          ID справи: <span className="font-medium text-foreground">{caseId}</span>
        </div>
      </div>

      {/* Верх: справа + AI */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl">{title}</CardTitle>
            <div className="text-sm text-muted-foreground">
              Створено: {formatDate(item.created_at)}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{statusUa(item.status)}</Badge>
              <span className="text-muted-foreground">·</span>
              <span>
                <span className="font-semibold">Пільга:</span> {benefitTitle}
              </span>
            </div>

            <Separator />

            <div className="space-y-1">
              <div className="font-semibold">Опис</div>
              <div className="text-muted-foreground">{description}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI-помічник</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Запитай, яких документів не вистачає або що робити далі.
            </p>

            <Textarea
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Наприклад: Які наступні кроки?"
            />

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const q = aiQuestion.trim();
                  if (!q) return;
                  setDocError(null);
                  askAiM.mutate(q);
                }}
                disabled={askAiM.isPending}
              >
                {askAiM.isPending ? "Думаю…" : "Запитати"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setAiQuestion("");
                  setAiAnswer(null);
                }}
              >
                Очистити
              </Button>
            </div>

            {aiAnswer ? (
              <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {aiAnswer}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Документи */}
      <Card className="mt-6">
        <CardHeader className="space-y-1">
          <CardTitle>Документи</CardTitle>
          <div className="text-sm text-muted-foreground">
            Готовність: <span className="font-medium text-foreground">{percent}%</span> ·
            Всього: <span className="font-medium text-foreground">{total}</span> ·
            Потрібні: <span className="font-medium text-foreground">{required}</span> ·
            Завантажені: <span className="font-medium text-foreground">{uploaded}</span> ·
            Погоджені: <span className="font-medium text-foreground">{approved}</span> ·
            Відхилені: <span className="font-medium text-foreground">{rejected}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {docError ? <p className="text-sm text-red-600">{docError}</p> : null}

          {docsQ.isLoading ? (
            <p className="text-sm">Завантаження документів…</p>
          ) : docsQ.isError ? (
            <p className="text-sm text-red-600">Не вдалося завантажити документи.</p>
          ) : docs.length === 0 ? (
            <p className="text-sm">Документів немає.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => {
                const pickedName = pickedFiles[d.id];
                const isUploadingThis = uploadM.isPending && uploadM.variables?.docId === d.id;
                const fileLabelId = `case-doc-file-${d.id}`;

                return (
                  <div key={d.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-base font-semibold">{d.title}</div>
                        <div className="text-xs text-muted-foreground">Документ ID: {d.id}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={docStatusBadgeVariant(d.status)}>
                          {docStatusUa(d.status)}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Файл + upload (без російського тексту) */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="text-sm">
                        <div className="font-semibold">Файл</div>

                        <div className="mt-1">
                          {d.file_name ? (
                            <a
                              className="underline"
                              href={getCaseDocumentDownloadUrl(caseId, d.id)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {d.file_name}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Не завантажено</span>
                          )}
                        </div>

                        {pickedName ? (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Обрано: <span className="font-medium text-foreground">{pickedName}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:items-end">
                        <input
                          id={fileLabelId}
                          className="hidden"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setPickedFiles((prev) => ({ ...prev, [d.id]: f.name }));
                          }}
                        />

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Button asChild variant="secondary">
                            <label htmlFor={fileLabelId} className="cursor-pointer">
                              Обрати файл
                            </label>
                          </Button>

                          <Button
                            onClick={() => {
                              const input = document.getElementById(fileLabelId) as HTMLInputElement | null;
                              const f = input?.files?.[0];
                              if (!f) {
                                setDocError("Спочатку обери файл.");
                                return;
                              }
                              setDocError(null);
                              uploadM.mutate({ docId: d.id, file: f });

                              // очистимо input (щоб можна було обрати той самий файл ще раз)
                              input.value = "";
                            }}
                            disabled={uploadM.isPending || !pickedFiles[d.id]}
                          >
                            {isUploadingThis ? "Завантажую…" : "Завантажити"}
                          </Button>
                        </div>

                        <div className="text-xs text-muted-foreground sm:text-right">
                          Формати: PDF/PNG/JPG
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="text-sm">
                      <span className="font-semibold">Коментар:</span>{" "}
                      {d.comment?.trim() ? (
                        d.comment
                      ) : (
                        <span className="text-muted-foreground">немає</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Заява (PDF)</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Натисни кнопку — система згенерує заяву та збереже її в артефакти.
          </p>

          <Button onClick={() => pdfM.mutate()} disabled={pdfM.isPending}>
            {pdfM.isPending ? "Генеруємо…" : "Сформувати заяву (PDF)"}
          </Button>

          {artifactsQ.isLoading ? (
            <p className="text-sm">Завантаження артефактів…</p>
          ) : artifactsQ.isError ? (
            <p className="text-sm text-red-600">Не вдалося завантажити артефакти.</p>
          ) : (artifactsQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm">Артефактів поки немає.</p>
          ) : (
            <div className="space-y-2">
              {(artifactsQ.data as CaseArtifactItem[]).map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">{a.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {a.type} ·{" "}
                    {a.created_at
                      ? new Date(a.created_at).toLocaleString("uk-UA")
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Історія */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Історія</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {historyQ.isLoading ? (
            <p className="text-sm">Завантаження історії…</p>
          ) : historyQ.isError ? (
            <p className="text-sm text-red-600">Не вдалося завантажити історію.</p>
          ) : (historyQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Історія порожня.</p>
          ) : (
            <div className="space-y-2">
              {(historyQ.data as CaseHistoryItem[]).map((h) => (
                <div key={h.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium">{h.comment}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(h.created_at)}
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    Статус:{" "}
                    <span className="font-medium text-foreground">
                      {statusUa(h.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
