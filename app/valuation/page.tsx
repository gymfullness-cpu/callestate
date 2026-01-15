"use client";

import { useMemo, useState } from "react";

export default function ValuationPage() {
  const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const detectPortal = (u: string) => {
    const x = (u || "").toLowerCase();
    if (x.includes("otodom")) return "Otodom";
    if (x.includes("gratka")) return "Gratka";
    if (x.includes("morizon")) return "Morizon";
    return "Inny";
  };

  const score10 = (raw: any): number | null => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (n >= 1 && n <= 10) return Math.round(n);
    if (n >= 0 && n <= 100) return Math.max(1, Math.round(n / 10));
    return Math.min(10, Math.max(1, Math.round(n)));
  };

  const portal = useMemo(() => detectPortal(url), [url]);

  const analyze = async () => {
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      if (!url.trim()) throw new Error("Wklej link do ogłoszenia.");
      if (!url.startsWith("http")) throw new Error("Link musi zaczynać się od http/https.");

      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, portal }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || "Błąd analizy.");

      setAnalysis((data as any).analysis);
    } catch (e: any) {
      setError(e?.message || "Nieznany błąd.");
    } finally {
      setLoading(false);
    }
  };

  const s10 = score10(analysis?.score);

  return (
    <main style={{ padding: 40, maxWidth: 900, margin: "0 auto", color: "var(--text-main)" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}> Wycena + analiza AI nieruchomości</h1>

      <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
        Wykryty portal: <b style={{ color: "var(--text-main)" }}>{portal}</b>
      </div>

      <input
        placeholder="Link do ogłoszenia (Otodom / Gratka / Morizon)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 14,
          borderRadius: 12,
          border: "1px solid var(--border-soft)",
          background: "rgba(255,255,255,0.05)",
          color: "var(--text-main)",
        }}
      />

      <button
        onClick={analyze}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "10px 18px",
          borderRadius: 12,
          border: "1px solid var(--border-soft)",
          background: "rgba(45,212,191,0.14)",
          color: "rgba(234,255,251,0.95)",
          fontWeight: 900,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        🤖 Analizuj (zapisze się do Market)
      </button>

      <label style={{ display: "block", marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
        <input
          type="checkbox"
          checked={showRaw}
          onChange={(e) => setShowRaw(e.target.checked)}
          style={{ marginRight: 8 }}
        />
        Pokaż surowe dane (debug)
      </label>

      {loading && <p style={{ marginTop: 12 }}>Analiza AI...</p>}
      {error && <p style={{ marginTop: 12, color: "rgba(239,68,68,0.95)" }}>{error}</p>}

      {analysis && (
        <div
          style={{
            marginTop: 30,
            padding: 24,
            background: "var(--bg-card)",
            borderRadius: 14,
            border: "1px solid var(--border-soft)",
            color: "var(--text-main)",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 900 }}>Wynik analizy</h3>

          <p>
            <b>Score:</b> {s10 !== null ? `${s10}/10` : "—"}
          </p>

          <p>
            <b>Wyświetlenia:</b>{" "}
            {typeof analysis?.views === "number" ? analysis.views.toLocaleString("pl-PL") : "—"}
          </p>

          {analysis?.marketAssessment && (
            <p>
              <b>Ocena rynku:</b> {analysis.marketAssessment}
            </p>
          )}

          {analysis?.recommendation && <p>{analysis.recommendation}</p>}

          <hr style={{ borderColor: "var(--border-soft)", margin: "16px 0" }} />

          <p>
            <b>Tytuł:</b> {analysis?.title || "—"}
          </p>
          <p>
            <b>Cena:</b> {analysis?.price ? `${analysis.price} zł` : "—"}
          </p>
          <p>
            <b>Metraż:</b> {analysis?.area ? `${analysis.area} m²` : "—"}
          </p>
          <p>
            <b>Cena / m²:</b> {analysis?.pricePerM2 ? `${analysis.pricePerM2} zł` : "—"}
          </p>

          <p>
            <b>Lokalizacja:</b> {analysis?.city || "—"}
            {analysis?.district ? `, ${analysis.district}` : ""}
            {analysis?.street ? `, ${analysis.street}` : ""}
          </p>

          {analysis?.description && (
            <>
              <hr style={{ borderColor: "var(--border-soft)", margin: "16px 0" }} />
              <p>
                <b>Opis:</b>
              </p>
              <p style={{ lineHeight: 1.6, color: "var(--text-muted)" }}>{analysis.description}</p>
            </>
          )}

          {showRaw && (
            <>
              <hr style={{ borderColor: "var(--border-soft)", margin: "16px 0" }} />
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: "rgba(0,0,0,0.35)",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border-soft)",
                  fontSize: 12,
                  color: "rgba(234,255,251,0.95)",
                }}
              >
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </main>
  );
}
