"use client";

import { useState } from "react";

export default function ScorePage() {
  const [data, setData] = useState({
    city: "",
    district: "",
    area: "",
    price: "",
    condition: "",
  });
  const [result, setResult] = useState<string | null>(null);

  const calculate = async () => {
    const res = await fetch("/api/property-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setResult(json.score);
  };

  return (
    <main style={{ padding: 40, maxWidth: 600 }}>
      <h1>“Š Scoring nieruchomości</h1>

      <input placeholder="Miasto" onChange={(e) => setData({ ...data, city: e.target.value })} />
      <input placeholder="Dzielnica" onChange={(e) => setData({ ...data, district: e.target.value })} />
      <input placeholder="Metraż (m2)" onChange={(e) => setData({ ...data, area: e.target.value })} />
      <input placeholder="Cena (zł)" onChange={(e) => setData({ ...data, price: e.target.value })} />
      <textarea placeholder="Stan (z analizy AI)" onChange={(e) => setData({ ...data, condition: e.target.value })} />

      <button onClick={calculate}>“ Oblicz score</button>

      {result && (
        <pre style={{ marginTop: 20, background: "#f5f5f5", padding: 15 }}>
          {result}
        </pre>
      )}
    </main>
  );
}
