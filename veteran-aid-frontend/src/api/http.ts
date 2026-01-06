import axios from "axios";

export const http = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("access_token");
      // м’яко повертаємо на login (без контексту)
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
