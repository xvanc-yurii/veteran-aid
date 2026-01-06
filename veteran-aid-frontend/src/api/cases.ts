// src/api/cases.ts
import { http } from "./http";

export type Case = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  benefit_id: number;
  created_at?: string;
};

export type CreateCaseRequest = {
  title: string;
  description?: string;
  benefit_id: number;
};

export async function fetchCases(): Promise<Case[]> {
  const res = await http.get<Case[]>("/cases");
  return res.data;
}

export async function createCase(data: CreateCaseRequest): Promise<Case> {
  const res = await http.post<Case>("/cases", data);
  return res.data;
}

// ✅ НОВЕ: отримати одну справу
export async function fetchCaseById(id: number): Promise<Case> {
  const res = await http.get<Case>(`/cases/${id}`);
  return res.data;
}
