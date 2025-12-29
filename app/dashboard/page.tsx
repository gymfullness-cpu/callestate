"use client";

import { useEffect, useState } from "react";

type Status = "Nowy" | "Oddzwonić" | "Zamknięty";

type Stats = {
  Nowy: number;
  Oddzwonić: number;
  Zamknięty: number;
  notesToday: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    Nowy: 0,
    Oddzwonić: 0,
    Zamknięty: 0,
    notesToday: 0,
  });

  useEffect(() => {
    let nowy = 0;
    let oddzwonic = 0;
    let zamkniety = 0;
    let notesToday = 0;

    const today = new Date().toLocaleDateString();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";

      // STATUSY
      if (key.startsWith("lead-status-")) {
        const value = localStorage.getItem(key);

        if (value === "Nowy") nowy++;
        if (value === "Oddzwonić") oddzwonic++;
        if (value === "Zamknięty") zamkniety++;
      }

      // NOTATKI
      if (key.startsWith("lead-notes-")) {
        const notes = JSON.parse(localStorage.getItem(key) || "[]");
        notes.forEach((note: { date: string }) => {
          if (note.date.startsWith(today)) {
            notesToday++;
          }
        });
      }
    }

    setStats({
      Nowy: nowy,
      Oddzwonić: oddzwonic,
      Zamknięty: zamkniety,
      notesToday,
    });
  }, []);

  const total = stats.Nowy + stats.Oddzwonić + stats.Zamknięty;
  const success =
    total > 0 ? Math.round((stats.Zamknięty / total) * 100) : 0;

  return (
    <main style={{ padding: 40 }}>
      <h1>📊 Dashboard agenta</h1>

      <ul>
        <li>📞 Leadów obsłużonych: <strong>{total}</strong></li>
        <li>🟡 Do oddzwonienia: <strong>{stats.Oddzwonić}</strong></li>
        <li>🟢 Zamknięte: <strong>{stats.Zamknięty}</strong></li>
        <li>📝 Notatek dziś: <strong>{stats.notesToday}</strong></li>
        <li>📈 Skuteczność: <strong>{success}%</strong></li>
      </ul>
    </main>
  );
}
