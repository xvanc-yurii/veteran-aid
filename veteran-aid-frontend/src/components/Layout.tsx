import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/useAuth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb" }}>
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <strong>Veteran Aid</strong>
          <nav style={{ display: "flex", gap: 12 }}>
            <Link to="/cases">Cases</Link>
            <Link to="/benefits">Benefits</Link>
          </nav>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {token ? (
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
        {children}
      </main>
    </div>
  );
}
