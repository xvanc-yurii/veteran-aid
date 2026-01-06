import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiLogin } from "../api/auth";
import { useAuth } from "../store/useAuth";
import axios from "axios";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, token } = useAuth();

  const [email, setEmail] = useState("user@admin.com");
  const [password, setPassword] = useState("admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // якщо вже є токен — можна одразу в cases
  if (token) {
    // але щоб не робити навігацію під час render — кнопка
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiLogin({ email, password });
      login(data.access_token);
      navigate("/cases");
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? "Login failed");
        } else {
        setError("Login failed");
        }
    }finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1>Login</h1>

      {token && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: "green" }}>Token already exists ✅</p>
          <button onClick={() => navigate("/cases")}>Go to cases</button>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </button>

        {error && <div style={{ color: "crimson" }}>{error}</div>}
      </form>
    </div>
  );
}
