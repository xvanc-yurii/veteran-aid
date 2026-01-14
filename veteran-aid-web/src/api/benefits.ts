// src/api/benefits.ts
import { http } from "@/api/http";

export type BenefitItem = {
  id: number;
  title: string;
  description?: string | null;
  authority?: string | null;
  required_documents?: string | null;
};

export async function fetchBenefits(): Promise<BenefitItem[]> {
  const res = await http.get<BenefitItem[]>("/benefits");
  return res.data;
}

// ✅ explain
export type BenefitExplain = {
  benefit_id: number;
  explanation: string;
};

export async function fetchBenefitExplain(benefitId: number) {
  const { data } = await http.get<BenefitExplain>(`/benefits/${benefitId}/explain`);
  return data;
}