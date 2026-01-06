import { useEffect, useState } from "react";
import axios from "axios";
import { createCase, fetchCases } from "../api/cases";
import type { Case } from "../api/cases";
import { http } from "../api/http";

type Benefit = {
  id: number;
  title: string;
};

async function fetchBenefits(): Promise<Benefit[]> {
  const res = await http.get<Benefit[]>("/benefits");
  return res.data;
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [benefitId, setBenefitId] = useState<number | "">("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [casesData, benefitsData] = await Promise.all([
        fetchCases(),
        fetchBenefits(),
      ]);
      setCases(casesData);
      setBenefits(benefitsData);

      // якщо ще не вибрано — підставимо перший benefit автоматично
      if (benefitsData.length > 0 && benefitId === "") {
        setBenefitId(benefitsData[0].id);
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError(
          (e.response?.data as { detail?: string })?.detail ??
            "Не вдалося завантажити cases/benefits"
        );
      } else {
        setError("Не вдалося завантажити cases/benefits");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Вкажи назву справи (title)");
      return;
    }
    if (benefitId === "") {
      setError("Обери пільгу (benefit)");
      return;
    }

    setSaving(true);
    try {
      const created = await createCase({
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        benefit_id: benefitId,
      });

      // додамо одразу в список
      setCases((prev) => [created, ...prev]);

      // очистимо форму
      setTitle("");
      setDescription("");
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        // FastAPI часто повертає detail як string або як масив помилок валідації
        const data = e.response?.data as
          | { detail?: string }
          | { detail?: Array<{ msg: string }> }
          | undefined;

        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
            ? data.detail.map((x) => x.msg).join(", ")
            : null;

        setError(detail ?? "Не вдалося створити справу");
      } else {
        setError("Не вдалося створити справу");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>Cases</h1>

      {error && (
        <p style={{ color: "crimson", marginTop: 8, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <form onSubmit={onCreate} style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Benefit</label>
          <select
            value={benefitId}
            onChange={(e) =>
              setBenefitId(e.target.value ? Number(e.target.value) : "")
            }
            style={{ width: 420, padding: 8 }}
          >
            {benefits.length === 0 ? (
              <option value="">Немає доступних пільг</option>
            ) : (
              benefits.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} (id: {b.id})
                </option>
              ))
            )}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: 420, padding: 8 }}
            placeholder="Напр. Компенсація проїзду"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: 420, padding: 8, minHeight: 90 }}
            placeholder="Короткий опис…"
          />
        </div>

        <button
          type="submit"
          disabled={saving || benefits.length === 0}
          style={{ padding: "8px 16px" }}
        >
          {saving ? "Creating..." : "Create case"}
        </button>
      </form>

      {cases.length === 0 ? (
        <p>No cases yet</p>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {cases.map((c) => (
            <li key={c.id} style={{ marginBottom: 8 }}>
              <b>{c.title}</b>
              {c.status ? <> — {c.status}</> : null}
              {typeof c.benefit_id === "number" ? (
                <> — benefit_id: {c.benefit_id}</>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
