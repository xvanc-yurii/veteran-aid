import { http } from "@/api/http";

export type CaseDocumentStatus =
  | "required"
  | "uploaded"
  | "approved"
  | "rejected";

export type CaseDocumentItem = {
  id: number;
  case_id: number;
  title: string;
  status: CaseDocumentStatus;
  comment?: string | null;
  file_name?: string | null;
};

// =======================
// LIST
// =======================
export async function fetchCaseDocuments(caseId: number) {
  const { data } = await http.get<CaseDocumentItem[]>(
    `/cases/${caseId}/documents`
  );
  return data;
}

// =======================
// UPDATE (status / comment)
// =======================
export async function updateCaseDocument(
  caseId: number,
  docId: number,
  payload: { status?: CaseDocumentStatus; comment?: string | null }
) {
  const { data } = await http.patch<CaseDocumentItem>(
    `/cases/${caseId}/documents/${docId}`,
    payload
  );
  return data;
}

// =======================
// UPLOAD
// =======================
export async function uploadCaseDocument(
  caseId: number,
  docId: number,
  file: File
) {
  const fd = new FormData();
  fd.append("file", file);

  const { data } = await http.post<CaseDocumentItem>(
    `/cases/${caseId}/documents/${docId}/upload`,
    fd,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

// =======================
// DOWNLOAD (AUTH SAFE) ✅
// =======================
export async function downloadCaseDocument(
  caseId: number,
  docId: number,
  fileName?: string
) {
  const res = await http.get(
    `/cases/${caseId}/documents/${docId}/download`,
    {
      responseType: "blob",
    }
  );

  const blob = new Blob([res.data]);
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "document";
  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
}

// =======================
// (залишаємо, якщо треба raw URL)
// ⚠️ без Authorization
// =======================
export function getCaseDocumentDownloadUrl(
  caseId: number,
  docId: number
) {
  return `${
    process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
  }/cases/${caseId}/documents/${docId}/download`;
}