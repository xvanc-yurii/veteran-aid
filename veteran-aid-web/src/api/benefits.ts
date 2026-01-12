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
