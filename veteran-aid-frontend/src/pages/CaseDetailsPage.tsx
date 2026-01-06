// src/pages/CaseDetailsPage.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCaseById } from "../api/cases";
import type { Case } from "../api/cases";

export default function CaseDetailsPage() {
  const params = useParams();
  const id = Number(params.id);

  const [item, setItem] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Некоректний id справи");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchCaseById(id)
      .then(setItem)
      .catch(() => setError("Не вдалося завантажити справу"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "crimson" }}>{error}</p>
        <Link to="/cases">← Назад до списку</Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: 24 }}>
        <p>Справу не знайдено</p>
        <Link to="/cases">← Назад до списку</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/cases">← Назад до списку</Link>
      </div>

      <h1 style={{ marginBottom: 12 }}>{item.title}</h1>

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <div>
          <b>ID:</b> {item.id}
        </div>
        <div>
          <b>Status:</b> {item.status}
        </div>
        <div>
          <b>Benefit ID:</b> {item.benefit_id}
        </div>
        {item.created_at && (
          <div>
            <b>Created:</b> {item.created_at}
          </div>
        )}
      </div>

      {item.description ? (
        <>
          <h3>Опис</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{item.description}</p>
        </>
      ) : (
        <p style={{ opacity: 0.7 }}>Опис відсутній</p>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* Заглушки для наступних кроків */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button disabled>Generate PDF (next)</button>
        <button disabled>Upload document (next)</button>
        <button disabled>Change status (next)</button>
      </div>
    </div>
  );
}
