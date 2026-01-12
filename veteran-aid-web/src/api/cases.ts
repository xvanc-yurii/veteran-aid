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
