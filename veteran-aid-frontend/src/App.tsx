import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import BenefitsPage from "./pages/BenefitsPage";
import CasesPage from "./pages/CasesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cases" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/cases"
        element={
          <ProtectedRoute>
            <Layout>
              <CasesPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/benefits"
        element={
          <ProtectedRoute>
            <Layout>
              <BenefitsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
    </Routes>
  );
}
