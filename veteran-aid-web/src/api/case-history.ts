import { http } from "@/api/http";

export type CaseHistoryItem = {
  id: number;
  case_id: number;
  status: string;
  comment: string;
  created_at: string; // ISO
};

export async function fetchCaseHistory(caseId: number) {
  const { data } = await http.get<CaseHistoryItem[]>(`/cases/${caseId}/history`);
  return data;
}
