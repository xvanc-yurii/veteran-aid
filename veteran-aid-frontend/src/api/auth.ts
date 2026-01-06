import { http } from "./http";

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export async function apiLogin(data: LoginRequest): Promise<TokenResponse> {
  const res = await http.post<TokenResponse>("/auth/login", data);
  return res.data;
}
