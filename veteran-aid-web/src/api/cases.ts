import { http } from "./http";

export type CaseItem = {
  id: number;
  user_id: number;
  benefit_id: number;
  status: string;
  title?: string | null;
  description?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export async function fetchCases(): Promise<CaseItem[]> {
  const res = await http.get<CaseItem[]>("/cases");
  return res.data;
}

export async function fetchCaseById(id: number): Promise<CaseItem> {
  const res = await http.get<CaseItem>(`/cases/${id}`);
  return res.data;
}

export type CaseProgress = {
  case_id: number;
  total: number;
  approved: number;
  uploaded: number;
  rejected: number;
  required: number;
  percent: number;
  is_ready_to_submit: boolean;
  is_ready_for_approval: boolean;
};

export async function fetchCaseProgress(caseId: number): Promise<CaseProgress> {
  const res = await http.get<CaseProgress>(`/cases/${caseId}/progress`);
  return res.data;
}

export type CaseCreatePayload = {
  benefit_id: number;
  title: string;
  description?: string;
};

export async function createCase(data: CaseCreatePayload) {
  const res = await http.post("/cases", data);
  return res.data;
}

function _filenameFromContentDisposition(cd?: string): string | null{
  if(!cd) return null;

  const m = /filename\*?=(?:UTF-8''|")?([^;"\n]+)"?/i.exec(cd);
  if(!m?.[1]) return null;

  try{
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export async function generateCaseApplicationPdf(caseId:number): Promise<{
  blob: Blob;
  filename: string;
}> {
  const res = await http.post(
    `/cases/${caseId}/application/pdf`,
    null,
    {responseType: "blob"}
  );

  const cd = (res.headers?.["content-disposition"] as string | undefined) ?? undefined;
  const filename = _filenameFromContentDisposition(cd) ?? `zayava_case_${caseId}.pdf`;

  return {blob: res.data as Blob, filename};
}