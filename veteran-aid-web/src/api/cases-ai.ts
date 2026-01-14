import { http } from "@/api/http";

export type CaseAskResponse = { answer: string };

export async function askCaseAI(caseId: number, question: string) {
  const { data } = await http.post<CaseAskResponse>(`/cases/${caseId}/ask`, {
    question,
  });
  return data;
}
