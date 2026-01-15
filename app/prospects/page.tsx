"use client";

import { useEffect, useMemo, useState } from "react";

type Prospect = {
  id: number;
  name: string;
  phone: string;
  note: string;
  followUpDate?: string;
  meetingDate?: string;
  source: string;
  createdAt: string;
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("prospects");
    if (saved) {
      const parsed = JSON.parse(saved).map((p: any) => ({
        id: typeof p.id === "number" ? p.id : Number(p.id),
        name: p.name || "",
        phone: p.phone || "",
        note: p.note || "",
        followUpDate: p.followUpDate || "",
        meetingDate: p.meetingDate || "",
        source: p.source || "Ogłoszenie",
        createdAt: p.createdAt || new Date().toISOString(),
      }));
      setProspects(parsed);
    }
  }, []);

  const updateProspect = (id: number, data: Partial<Prospect>) => {
    const updated = prospects.map((p) => (p.id === id ? { ...p, ...data } : p));
    setProspects(updated);
    localStorage.setItem("prospects", JSON.stringify(updated));
  };

  const saveFollowUp = (p: Prospect) => {
    if (!p.followUpDate) return alert("Wybierz datę follow-upu");

    const followups = JSON.parse(localStorage.getItem("followups") || "[]");

    followups.push({
      id: Date.now(),
      type: "pozysk",
      relatedId: p.id,
      dueDate: p.followUpDate,
      status: "pending",
    });

    localStorage.setItem("followups", JSON.stringify(followups));
    alert("✅ Follow-up zapisany");
  };

  const saveMeeting = (p: Prospect) => {
    if (!p.meetingDate) return alert("Wybierz datę spotkania");

    const meetings = JSON.parse(localStorage.getItem("meetings") || "[]");

    meetings.push({
      id: Date.now(),
      name: p.name || "Spotkanie pozyskowe",
      phone: p.phone,
      date: p.meetingDate.split("T")[0],
      time: p.meetingDate.split("T")[1],
      type: "pozyskowe",
      status: "zaplanowane",
    });

    localStorage.setItem("meetings", JSON.stringify(meetings));
    alert("✅ Spotkanie dodane do kalendarza");
  };

  const stats = useMemo(() => {
    const all = prospects.length;
    const withFollowup = prospects.filter((p) => (p.followUpDate ?? "").trim().length > 0).length;
    const withMeeting = prospects.filter((p) => (p.meetingDate ?? "").trim().length > 0).length;
    return { all, withFollowup, withMeeting };
  }, [prospects]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{
              border: "1px solid rgba(45,212,191,0.25)",
              background: "rgba(45,212,191,0.08)",
              color: "rgba(234,255,251,0.92)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>⟡</span> Pozyski / CRM
          </div>

          <h1
            className="mt-3 text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            Pozyski
          </h1>

          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Notatki, follow-upy i spotkania pozyskowe w jednym miejscu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi label="Wszystkie" value={stats.all} tone="neutral" />
          <Kpi label="Z follow-up" value={stats.withFollowup} tone="mint" />
          <Kpi label="Ze spotkaniem" value={stats.withMeeting} tone="blue" />
        </div>
      </div>

      {/* EMPTY */}
      {prospects.length === 0 ? (
        <section
          className="mt-7 rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Brak pozysków. Dodaj pierwszego (np. z modułu „Market” albo ręcznie).
          </p>
        </section>
      ) : null}

      {/* LIST */}
      <section className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {prospects.map((p) => (
          <div
            key={p.id}
            className="surface-light p-6"
            style={{ color: "var(--text-main)" }}
          >
            {/* top line */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className="text-xs font-extrabold uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  Źródło
                </div>
                <div className="mt-1 text-sm font-black" style={{ color: "var(--text-main)" }}>
                  {p.source || ""}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap justify-end">
                {(p.followUpDate ?? "").trim() ? (
                  <Badge tone="mint">follow-up</Badge>
                ) : (
                  <Badge tone="neutral">brak follow-up</Badge>
                )}
                {(p.meetingDate ?? "").trim() ? <Badge tone="blue">spotkanie</Badge> : null}
              </div>
            </div>

            <div className="mt-5 h-px w-full" style={{ background: "rgba(255,255,255,0.10)" }} />

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label-light">Imię i nazwisko</label>
                <input
                  className="input-light"
                  placeholder="Jan Kowalski"
                  value={p.name}
                  onChange={(e) => updateProspect(p.id, { name: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-light">Telefon</label>
                <input
                  className="input-light"
                  placeholder="600 000 000"
                  value={p.phone}
                  onChange={(e) => updateProspect(p.id, { phone: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-light">Notatka</label>
                <textarea
                  className="input-light h-24 resize-y"
                  placeholder="Szczegóły rozmowy…"
                  value={p.note}
                  onChange={(e) => updateProspect(p.id, { note: e.target.value })}
                />
              </div>

              <div>
                <label className="label-light">Follow-up</label>
                <input
                  className="input-light"
                  type="date"
                  value={p.followUpDate || ""}
                  onChange={(e) => updateProspect(p.id, { followUpDate: e.target.value })}
                />
                <button className="btn-mint mt-3 w-full" onClick={() => saveFollowUp(p)}>
                  Zapisz follow-up
                </button>
              </div>

              <div>
                <label className="label-light">Spotkanie pozyskowe</label>
                <input
                  className="input-light"
                  type="datetime-local"
                  value={p.meetingDate || ""}
                  onChange={(e) => updateProspect(p.id, { meetingDate: e.target.value })}
                />
                <button className="btn-dark mt-3 w-full" onClick={() => saveMeeting(p)}>
                  Dodaj do kalendarza
                </button>
              </div>
            </div>

            <div className="mt-5 text-xs" style={{ color: "var(--text-muted)" }}>
              Dodano:{" "}
              <span style={{ color: "var(--text-main)", fontWeight: 800 }}>
                {new Date(p.createdAt).toLocaleString("pl-PL")}
              </span>
            </div>

            <style jsx>{`
              .label-light {
                font-size: 12px;
                font-weight: 900;
                margin-bottom: 6px;
                display: block;
                color: var(--text-muted);
                letter-spacing: 0.2px;
              }
              .input-light {
                width: 100%;
                padding: 12px 12px;
                border-radius: 14px;
                border: 1px solid var(--border-soft);
                background: rgba(255, 255, 255, 0.04);
                color: var(--text-main);
                outline: none;
                transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
              }
              .input-light:focus {
                border-color: rgba(45, 212, 191, 0.55);
                box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
                background: rgba(255, 255, 255, 0.05);
              }
              .btn-mint {
                border-radius: 14px;
                padding: 10px 14px;
                font-weight: 900;
                border: 1px solid rgba(45, 212, 191, 0.35);
                background: rgba(45, 212, 191, 0.12);
                color: rgba(234, 255, 251, 0.95);
                cursor: pointer;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
              }
              .btn-mint:hover {
                transform: translateY(-1px);
                box-shadow: 0 14px 36px rgba(45, 212, 191, 0.18);
              }
              .btn-dark {
                border-radius: 14px;
                padding: 10px 14px;
                font-weight: 900;
                border: 1px solid rgba(255, 255, 255, 0.14);
                background: rgba(255, 255, 255, 0.06);
                color: var(--text-main);
                cursor: pointer;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
              }
              .btn-dark:hover {
                transform: translateY(-1px);
                box-shadow: 0 18px 46px rgba(0, 0, 0, 0.22);
              }
            `}</style>
          </div>
        ))}
      </section>
    </main>
  );
}

/* ====== helpers ====== */

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "mint" | "blue";
}) {
  const toneStyle: Record<string, React.CSSProperties> = {
    neutral: {
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      color: "var(--text-main)",
    },
    mint: {
      border: "1px solid rgba(45,212,191,0.30)",
      background: "rgba(45,212,191,0.10)",
      color: "rgba(234,255,251,0.95)",
    },
    blue: {
      border: "1px solid rgba(29,78,216,0.30)",
      background: "rgba(29,78,216,0.10)",
      color: "rgba(224,232,255,0.95)",
    },
  };

  return (
    <div className="rounded-2xl px-4 py-3" style={toneStyle[tone]}>
      <div className="text-xs font-extrabold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "mint" | "blue" | "neutral";
}) {
  const map: Record<string, React.CSSProperties> = {
    mint: {
      border: "1px solid rgba(45,212,191,0.35)",
      background: "rgba(45,212,191,0.10)",
      color: "rgba(234,255,251,0.95)",
    },
    blue: {
      border: "1px solid rgba(29,78,216,0.30)",
      background: "rgba(29,78,216,0.10)",
      color: "rgba(224,232,255,0.95)",
    },
    neutral: {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(234,255,251,0.88)",
    },
  };

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
      style={map[tone]}
    >
      {children}
    </span>
  );
}
