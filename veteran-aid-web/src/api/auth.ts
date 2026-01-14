import { http } from "./http";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  const res = await http.post<LoginResponse>("/auth/login", payload);
  return res.data;
}

export type RegisterPayload = {
  email: string;
  password: string;

  // опціонально — якщо бек це приймає
  full_name?: string;
  status?: string; // наприклад: "veteran" | "family" | "other"
  region?: string;
};

export type RegisterResponse = {
  id?: number;
  email?: string;
  message?: string;
};

export async function register(payload: RegisterPayload) {
  const { data } = await http.post<RegisterResponse>("/auth/register", payload);
  return data;
}

