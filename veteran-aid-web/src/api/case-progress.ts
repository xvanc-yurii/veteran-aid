import { http } from "@/api/http";

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
