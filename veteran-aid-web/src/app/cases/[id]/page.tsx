"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { VariantProps } from "class-variance-authority";

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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

export default function CaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();

  const caseId = useMemo(() => {
    const raw = params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const [docError, setDocError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>("");

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

  const updateDocM = useMutation({
    mutationFn: (payload: {
      docId: number;
      data: { status?: CaseDocumentStatus; comment?: string | null };
    }) => updateCaseDocument(caseId as number, payload.docId, payload.data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["case-documents", caseId] });
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e) => setDocError(getAxiosDetail(e) ?? "Не вдалося оновити документ"),
  });

  const uploadM = useMutation({
    mutationFn: (p: { docId: number; file: File }) =>
      uploadCaseDocument(caseId as number, p.docId, p.file),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["case-documents", caseId] });
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
    },
    onError: (e) => setDocError(getAxiosDetail(e) ?? "Не вдалося завантажити файл"),
  });

  if (caseId === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
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
      <main className="mx-auto max-w-5xl px-4 py-10">
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
    benefits.find((b) => b.id === item.benefit_id)?.title ?? `ID: ${item.benefit_id}`;

  const title = item.title?.trim() ? item.title.trim() : "Без назви";
  const description = item.description?.trim() ? item.description.trim() : "Опис відсутній";

  const docs: CaseDocumentItem[] = docsQ.data ?? [];
  const total = docs.length;
  const approved = docs.filter((d) => d.status === "approved").length;
  const uploaded = docs.filter((d) => d.status === "uploaded").length;
  const rejected = docs.filter((d) => d.status === "rejected").length;
  const required = docs.filter((d) => d.status === "required").length;
  const percent = total > 0 ? Math.round((approved / total) * 100) : 0;

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
          <CardTitle>Документи</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="font-semibold">Готовність:</span> {percent}% ·{" "}
            <span className="font-semibold">Всього:</span> {total} ·{" "}
            <span className="font-semibold">Потрібні:</span> {required} ·{" "}
            <span className="font-semibold">Завантажені:</span> {uploaded} ·{" "}
            <span className="font-semibold">Погоджені:</span> {approved} ·{" "}
            <span className="font-semibold">Відхилені:</span> {rejected}
          </div>

          {docError && <p className="text-sm text-red-600">{docError}</p>}

          {docsQ.isLoading ? (
            <p className="text-sm">Завантаження документів…</p>
          ) : docsQ.isError ? (
            <p className="text-sm text-red-600">Не вдалося завантажити документи.</p>
          ) : docs.length === 0 ? (
            <p className="text-sm">Документів немає.</p>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <div key={d.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold">{d.title}</div>
                      <div className="text-xs text-muted-foreground">ID: {d.id}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={docStatusBadgeVariant(d.status)}>
                        {docStatusUa(d.status)}
                      </Badge>

                      <Select
                        value={d.status}
                        onValueChange={(v) => {
                          setDocError(null);
                          updateDocM.mutate({
                            docId: d.id,
                            data: { status: v as CaseDocumentStatus },
                          });
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="required">Потрібно</SelectItem>
                          <SelectItem value="uploaded">Завантажено</SelectItem>
                          <SelectItem value="approved">Погоджено</SelectItem>
                          <SelectItem value="rejected">Відхилено</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ✅ Файл + завантаження */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      <span className="font-semibold">Файл:</span>{" "}
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
                        <span className="text-muted-foreground">не завантажено</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setDocError(null);
                          uploadM.mutate({ docId: d.id, file: f });
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="font-semibold">Коментар:</span>{" "}
                    {d.comment?.trim() ? (
                      d.comment
                    ) : (
                      <span className="text-muted-foreground">немає</span>
                    )}
                  </div>

                  {editingCommentId === d.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder='Напиши коментар (наприклад: “потрібна краща якість скану”)'
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setDocError(null);
                            updateDocM.mutate({
                              docId: d.id,
                              data: { comment: commentDraft.trim() ? commentDraft.trim() : "" },
                            });
                            setEditingCommentId(null);
                            setCommentDraft("");
                          }}
                          disabled={updateDocM.isPending}
                        >
                          Зберегти
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingCommentId(null);
                            setCommentDraft("");
                          }}
                        >
                          Скасувати
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDocError(null);
                        setEditingCommentId(d.id);
                        setCommentDraft(d.comment ?? "");
                      }}
                    >
                      Редагувати коментар
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
