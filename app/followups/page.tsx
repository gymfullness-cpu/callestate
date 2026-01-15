"use client";

import { useEffect, useMemo, useState } from "react";

type FollowUpType = "pozysk" | "prezentacja" | "inne";

type FollowUp = {
  id: number;
  relatedId: number;
  type: FollowUpType;
  otherLabel?: string; // tylko dla "inne"
  dueAt: string; // ISO string
  status: "pending" | "done";
};

const STORAGE_KEY = "followups_v2";

function formatPLDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function daysDiffFromIso(iso: string) {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  const ms = target - startOfToday();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function minutesDiffFromIso(iso: string) {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.round((target - now) / (1000 * 60));
}

function typeLabel(t: FollowUpType, otherLabel?: string) {
  if (t === "pozysk") return "Pozysk";
  if (t === "prezentacja") return "Prezentacja";
  return otherLabel?.trim() ? `Inne: ${otherLabel.trim()}` : "Inne";
}

function typeMeta(t: FollowUpType) {
  if (t === "pozysk") {
    return {
      dot: "rgba(45,212,191,0.95)",
      bg: "rgba(45,212,191,0.10)",
      border: "rgba(45,212,191,0.28)",
      text: "#0f172a",
    };
  }
  if (t === "prezentacja") {
    return {
      dot: "rgba(29,78,216,0.95)",
      bg: "rgba(29,78,216,0.10)",
      border: "rgba(29,78,216,0.22)",
      text: "#0f172a",
    };
  }
  // inne
  return {
    dot: "rgba(245,158,11,0.95)",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.28)",
    text: "#0f172a",
  };
}

/** migracja ze starego STORAGE_KEY="followups" (YYYY-MM-DD bez godziny) */
function migrateOldIfNeeded() {
  try {
    const existsV2 = localStorage.getItem(STORAGE_KEY);
    if (existsV2) return;

    const rawOld = localStorage.getItem("followups");
    if (!rawOld) return;

    const parsed: any[] = JSON.parse(rawOld);
    if (!Array.isArray(parsed)) return;

    const migrated: FollowUp[] = parsed
      .map((x) => {
        const id = typeof x?.id === "number" ? x.id : Number(x?.id);
        const relatedId = typeof x?.relatedId === "number" ? x.relatedId : Number(x?.relatedId);
        const type: FollowUpType =
          x?.type === "pozysk" || x?.type === "prezentacja" ? x.type : "inne";
        const status: "pending" | "done" = x?.status === "done" ? "done" : "pending";
        const dueDate = typeof x?.dueDate === "string" ? x.dueDate : "";
        if (!Number.isFinite(id) || !Number.isFinite(relatedId) || !dueDate) return null;

        // domyślnie 12:00 dla starych
        const dueAt = new Date(`${dueDate}T12:00:00`).toISOString();

        return {
          id,
          relatedId,
          type,
          dueAt,
          status,
        } as FollowUp;
      })
      .filter(Boolean) as FollowUp[];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  } catch {
    // ignore
  }
}

/** Bezpieczne wczytanie follow-upów z localStorage (v2) */
function readStoredFollowUps(): FollowUp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const out: FollowUp[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const obj = x as any;

      const id = typeof obj.id === "number" ? obj.id : Number(obj.id);
      const relatedId = typeof obj.relatedId === "number" ? obj.relatedId : Number(obj.relatedId);
      const type: FollowUpType =
        obj.type === "pozysk" || obj.type === "prezentacja" || obj.type === "inne" ? obj.type : "inne";
      const otherLabel = typeof obj.otherLabel === "string" ? obj.otherLabel : undefined;
      const dueAt = typeof obj.dueAt === "string" ? obj.dueAt : "";
      const status = obj.status === "pending" || obj.status === "done" ? obj.status : "pending";

      if (!Number.isFinite(id) || !Number.isFinite(relatedId) || !dueAt) continue;

      out.push({ id, relatedId, type, otherLabel, dueAt, status });
    }
    return out;
  } catch {
    return [];
  }
}

function nextId(items: FollowUp[]) {
  const max = items.reduce((m, x) => (x.id > m ? x.id : m), 0);
  return max + 1;
}

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toISO(date: string, time: string) {
  // lokalny czas -> ISO
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 12, mm ?? 0, 0);
  return dt.toISOString();
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [sort, setSort] = useState<"dateAsc" | "dateDesc">("dateAsc");

  // --- FORM STATE (dodawanie) ---
  const [openAdd, setOpenAdd] = useState(true);
  const [newType, setNewType] = useState<FollowUpType>("pozysk");
  const [newOtherLabel, setNewOtherLabel] = useState<string>("");
  const [newRelatedId, setNewRelatedId] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>(todayYYYYMMDD());
  const [newDueTime, setNewDueTime] = useState<string>(nowHHMM());
  const [formError, setFormError] = useState<string>("");

  useEffect(() => {
    migrateOldIfNeeded();
    setItems(readStoredFollowUps());
  }, []);

  const persist = (data: FollowUp[]) => {
    setItems(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const addFollowUp = () => {
    setFormError("");

    const rid = Number(newRelatedId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setFormError("Podaj poprawne ID powiązania (liczba > 0).");
      return;
    }

    if (!newDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)) {
      setFormError("Wybierz poprawną datę (YYYY-MM-DD).");
      return;
    }
    if (!newDueTime || !/^\d{2}:\d{2}$/.test(newDueTime)) {
      setFormError("Wybierz poprawną godzinę (HH:MM).");
      return;
    }

    if (newType === "inne" && !newOtherLabel.trim()) {
      setFormError('Dla typu "Inne" wpisz nazwę/etykietę (np. "Notariusz", "Podpisanie", "Spotkanie").');
      return;
    }

    const dueAt = toISO(newDueDate, newDueTime);

    const newItem: FollowUp = {
      id: nextId(items),
      relatedId: rid,
      type: newType,
      otherLabel: newType === "inne" ? newOtherLabel.trim() : undefined,
      dueAt,
      status: "pending",
    };

    persist([newItem, ...items]);

    setFilter("pending");
    setSort("dateAsc");
    setNewRelatedId("");

    if (newType !== "inne") setNewOtherLabel("");
  };

  const markDone = (id: number) => {
    persist(items.map((f) => (f.id === id ? { ...f, status: "done" as const } : f)));
  };

  const reopen = (id: number) => {
    persist(items.map((f) => (f.id === id ? { ...f, status: "pending" as const } : f)));
  };

  const remove = (id: number) => {
    if (!confirm("Usunąć follow-up?")) return;
    persist(items.filter((x) => x.id !== id));
  };

  const stats = useMemo(() => {
    const all = items.length;
    const pending = items.filter((x) => x.status === "pending").length;
    const done = items.filter((x) => x.status === "done").length;
    const overdue = items.filter((x) => x.status === "pending" && (minutesDiffFromIso(x.dueAt) ?? 0) < 0).length;
    return { all, pending, done, overdue };
  }, [items]);

  const visible = useMemo(() => {
    let arr = [...items];
    if (filter !== "all") arr = arr.filter((x) => x.status === filter);

    arr.sort((a, b) => {
      const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return sort === "dateAsc" ? da - db : db - da;
    });

    return arr;
  }, [items, filter, sort]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            📌 Follow-upy
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Lista zadań do oddzwonienia / dopięcia tematu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Wszystkie" value={stats.all} tone="neutral" />
          <Kpi label="Do zrobienia" value={stats.pending} tone="mint" />
          <Kpi label="Zrobione" value={stats.done} tone="blue" />
          <Kpi label="Po terminie" value={stats.overdue} tone="amber" />
        </div>
      </div>

      {/* ADD FOLLOW-UP */}
      <section
        className="mt-7 rounded-2xl p-5"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "var(--text-main)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-extrabold" style={{ letterSpacing: "-0.02em" }}>
            ➕ Dodaj follow-up
          </div>

          <button
            onClick={() => setOpenAdd((v) => !v)}
            className="rounded-full px-4 py-2 text-xs font-extrabold"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
          >
            {openAdd ? "Zwiń" : "Rozwiń"}
          </button>
        </div>

        {/* fix niewidocznych option: optionColorFix */}
        <style>{optionColorFix}</style>

        {openAdd && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* TYPE */}
            <div className="md:col-span-3">
              <label className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
                Typ
              </label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as FollowUpType)} style={inputStyle}>
                <option value="pozysk">Pozysk</option>
                <option value="prezentacja">Prezentacja</option>
                <option value="inne">Inne</option>
              </select>
            </div>

            {/* OTHER LABEL */}
            {newType === "inne" && (
              <div className="md:col-span-4">
                <label className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
                  Nazwa dla „Inne”
                </label>
                <input
                  value={newOtherLabel}
                  onChange={(e) => setNewOtherLabel(e.target.value)}
                  placeholder='np. "Notariusz", "Podpisanie", "Spotkanie"'
                  style={inputStyle}
                />
              </div>
            )}

            {/* RELATED ID */}
            <div className={newType === "inne" ? "md:col-span-3" : "md:col-span-4"}>
              <label className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
                Powiązanie ID (np. lead/prospect)
              </label>
              <input
                value={newRelatedId}
                onChange={(e) => setNewRelatedId(e.target.value)}
                placeholder="np. 123"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>

            {/* DUE DATE */}
            <div className="md:col-span-2">
              <label className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
                Data
              </label>
              <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} style={inputStyle} />
            </div>

            {/* DUE TIME */}
            <div className="md:col-span-2">
              <label className="text-xs font-extrabold" style={{ color: "var(--text-muted)" }}>
                Godzina
              </label>
              <input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} style={inputStyle} />
            </div>

            {/* ADD BUTTON */}
            <div className="md:col-span-2 flex items-end">
              <button onClick={addFollowUp} className="w-full rounded-xl py-3 text-sm font-extrabold" style={addBtn}>
                Dodaj
              </button>
            </div>

            {formError ? (
              <div className="md:col-span-12 text-sm font-bold" style={{ color: "rgba(255,200,200,0.95)" }}>
                {formError}
              </div>
            ) : (
              <div className="md:col-span-12 text-xs" style={{ color: "var(--text-muted)" }}>
                Tip: dla „Inne” wpisz etykietę. Godzina wpływa na “po terminie” dokładnie co do minut.
              </div>
            )}
          </div>
        )}
      </section>

      {/* CONTROLS */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button style={filter === "pending" ? pillActive : pillIdle} onClick={() => setFilter("pending")}>
            Pending
          </button>
          <button style={filter === "done" ? pillActive : pillIdle} onClick={() => setFilter("done")}>
            Done
          </button>
          <button style={filter === "all" ? pillActive : pillIdle} onClick={() => setFilter("all")}>
            Wszystkie
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "dateAsc" | "dateDesc")}
            style={{
              ...inputStyle,
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
              marginTop: 0,
            }}
          >
            <option value="dateAsc">Data ↑ (najbliższe)</option>
            <option value="dateDesc">Data ↓ (najdalsze)</option>
          </select>
        </div>
      </div>

      {/* LIST */}
      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 ? (
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-main)",
            }}
          >
            Brak follow-upów w tym widoku.
          </div>
        ) : (
          visible.map((f) => {
            const meta = typeMeta(f.type);
            const ddDays = daysDiffFromIso(f.dueAt);
            const ddMin = minutesDiffFromIso(f.dueAt);
            const isOverdue = f.status === "pending" && (ddMin ?? 0) < 0;

            return (
              <div
                key={f.id}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.96)",
                  border: isOverdue ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(15,23,42,0.10)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
                        style={{
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          color: meta.text,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: meta.dot,
                            display: "inline-block",
                          }}
                        />
                        {typeLabel(f.type, f.otherLabel)}
                      </span>

                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                        style={{
                          background: f.status === "done" ? "rgba(16,185,129,0.10)" : "rgba(15,23,42,0.06)",
                          border: "1px solid rgba(15,23,42,0.10)",
                          color: "rgba(15,23,42,0.72)",
                        }}
                      >
                        {f.status === "done" ? "Zrobione" : "Do zrobienia"}
                      </span>

                      {isOverdue ? (
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                          style={{
                            background: "rgba(239,68,68,0.10)",
                            border: "1px solid rgba(239,68,68,0.22)",
                            color: "rgba(185,28,28,0.95)",
                          }}
                        >
                          Po terminie
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-sm font-black" style={{ color: "#0f172a" }}>
                      🕒 {formatPLDateTime(f.dueAt)}
                      {ddDays !== null ? (
                        <span style={{ marginLeft: 10, fontWeight: 900, color: "rgba(15,23,42,0.62)" }}>
                          {ddDays === 0 ? "(dzisiaj)" : ddDays > 0 ? `(za ${ddDays} dni)` : `(${Math.abs(ddDays)} dni po terminie)`}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-xs" style={{ color: "rgba(15,23,42,0.65)" }}>
                      Powiązanie ID: <span style={{ fontWeight: 900 }}>{f.relatedId}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {f.status === "pending" ? (
                      <button
                        onClick={() => markDone(f.id)}
                        className="rounded-xl px-3 py-2 text-xs font-extrabold"
                        style={{
                          background: "rgba(45,212,191,0.14)",
                          border: "1px solid rgba(45,212,191,0.35)",
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                        title="Oznacz jako zrobione"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => reopen(f.id)}
                        className="rounded-xl px-3 py-2 text-xs font-extrabold"
                        style={{
                          background: "rgba(29,78,216,0.10)",
                          border: "1px solid rgba(29,78,216,0.22)",
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                        title="Przywróć do pending"
                      >
                        ↩︎
                      </button>
                    )}

                    <button
                      onClick={() => remove(f.id)}
                      className="rounded-xl px-3 py-2 text-xs font-extrabold"
                      style={{
                        background: "rgba(239,68,68,0.10)",
                        border: "1px solid rgba(239,68,68,0.22)",
                        color: "rgba(185,28,28,0.95)",
                        cursor: "pointer",
                      }}
                      title="Usuń"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {f.status === "pending" ? (
                  <button
                    onClick={() => markDone(f.id)}
                    className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold"
                    style={{
                      background: "rgba(45,212,191,0.14)",
                      border: "1px solid rgba(45,212,191,0.35)",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    ✓ Zrobione
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

/* ====== UI bits ====== */

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-main)",
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 900,
  outline: "none",
};

// FIX: option w select często ma domyślnie czarny tekst na ciemnym tle albo odwrotnie.
// To daje czytelność w każdym motywie.
const optionColorFix = `
  select option {
    color: #0f172a;
    background: #f8fafc;
  }
  [data-theme="offwhite"] select option {
    color: #0f172a;
    background: #ffffff;
  }
`;

const addBtn: React.CSSProperties = {
  background: "rgba(45,212,191,0.14)",
  border: "1px solid rgba(45,212,191,0.35)",
  color: "rgba(234,255,251,0.95)",
  cursor: "pointer",
};

const pillActive: React.CSSProperties = {
  background: "rgba(45,212,191,0.14)",
  border: "1px solid rgba(45,212,191,0.35)",
  color: "rgba(234,255,251,0.95)",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const pillIdle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-main)",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "mint" | "blue" | "amber";
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
    amber: {
      border: "1px solid rgba(245,158,11,0.28)",
      background: "rgba(245,158,11,0.10)",
      color: "rgba(255,236,200,0.95)",
    },
  };

  return (
    <div className="rounded-2xl px-4 py-3" style={toneStyle[tone]}>
      <div className="text-xs font-extrabold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}
