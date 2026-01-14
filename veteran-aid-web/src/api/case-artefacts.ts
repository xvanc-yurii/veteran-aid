import { http } from "@/api/http";

export type CaseArtifactItem = {
  id: number;
  case_id: number;
  type: string; // "application_pdf"
  title: string;
  content_text?: string | null;
  created_at?: string | null;
};

export async function fetchCaseArtifacts(caseId: number) {
  const { data } = await http.get<CaseArtifactItem[]>(`/cases/${caseId}/artifacts`);
  return data;
}

// PDF як файл (blob)
export async function generateApplicationPdf(caseId: number) {
  const res = await http.post(`/cases/${caseId}/application/pdf`, null, {
    responseType: "blob",
  });
  return res.data as Blob;
}
