"use client";

import { useEffect, useRef, useState } from "react";

type DueItem = {
  id: string;
  name?: string;
  followUpAt?: string;
  followUpNote?: string | null;
};

export default function FollowUpWatcher() {
  const [count, setCount] = useState(0);
  const [lastNew, setLastNew] = useState<DueItem[]>([]);
  const lastIdsRef = useRef<Set<string>>(new Set());
  const firstRunRef = useRef(true);

  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch("/api/followups/due", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const due: DueItem[] = Array.isArray(data?.due) ? data.due : [];

        const ids = new Set(due.map((x) => x.id));
        const newlyDue = due.filter((x) => !lastIdsRef.current.has(x.id));

        setCount(ids.size);

        // nie spamuj powiadomieniem przy pierwszym wejściu na stronę
        if (!firstRunRef.current && newlyDue.length > 0) {
          setLastNew(newlyDue.slice(0, 3));

          // dźwięk (bardzo krótki beep)
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 880;
            g.gain.value = 0.03;
            o.start();
            setTimeout(() => {
              o.stop();
              ctx.close();
            }, 120);
          } catch {
            // audio może być blokowane — ignoruj
          }
        }

        firstRunRef.current = false;
        lastIdsRef.current = ids;
      } catch {
        // ignoruj błędy sieci
      }
    };

    tick();
    const t = setInterval(tick, 45_000);
    return () => clearInterval(t);
  }, []);

  // mały toast w rogu, gdy coś jest do zrobienia
  if (count === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        width: 320,
        maxWidth: "calc(100vw - 32px)",
        borderRadius: 16,
        border: "1px solid var(--border-soft)",
        background: "color-mix(in srgb, var(--bg-main-2) 78%, rgba(255,255,255,0.08))",
        color: "var(--text-main)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
        backdropFilter: "blur(10px)",
        padding: "12px 12px",
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
          🔁 Follow-up: <span style={{ color: "var(--accent)" }}>{count}</span>
        </div>

        <a
          href="/followups"
          style={{
            fontWeight: 800,
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid var(--border-soft)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          Otwórz
        </a>
      </div>

      {lastNew.length > 0 && (
        <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.35 }}>
          Nowe do zrobienia:
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {lastNew.map((x) => (
              <li key={x.id}>
                {x.name ? <b style={{ color: "var(--text-main)" }}>{x.name}</b> : "Klient"}{" "}
                {x.followUpNote ? `— ${x.followUpNote}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
