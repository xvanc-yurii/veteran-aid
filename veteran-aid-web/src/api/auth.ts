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
