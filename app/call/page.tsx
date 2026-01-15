"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: number;
  name: string;
  phone: string;
};

const leads: Lead[] = [
  { id: 1, name: "Jan Kowalski", phone: "600123456" },
  { id: 2, name: "Anna Nowak", phone: "500987654" },
  { id: 3, name: "Piotr Zieliński", phone: "700111222" },
];

export default function CallMode() {
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const lead = leads[index];

  useEffect(() => {
    setSeconds(0);
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [index]);

  const nextLead = () => {
    setIndex((i) => (i + 1) % leads.length);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Tryb cold calling</h1>

      <h2>{lead.name}</h2>

      <p>
        <strong>Telefon:</strong>{" "}
        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
      </p>

      <p>
        ± Czas rozmowy: <strong>{seconds}s</strong>
      </p>

      <button
        onClick={() => (window.location.href = `tel:${lead.phone}`)}
        style={{ marginRight: 10 }}
      >
        “ž Zadzwoń
      </button>

      <button onClick={nextLead}>žˇď¸🏠 Nastć™pny lead</button>
    </main>
  );
}
