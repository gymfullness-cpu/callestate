"use client";

import React, { useEffect, useMemo, useState } from "react";

/* =========================
   TYPES
========================= */

type EventType = "pozysk" | "prezentacja" | "umowa" | "inne";

type CalendarEvent = {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  note: string;
  type: EventType;
  durationMin?: number; // opcjonalnie (domyślnie 30)
};

const STORAGE_KEY = "calendar-events";

/* =========================
   META
========================= */

const WEEKDAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

const TYPE_META: Record<
  EventType,
  { label: string; dot: string; pillBg: string; pillBorder: string; pillText: string }
> = {
  pozysk: {
    label: "Pozysk",
    dot: "rgba(45,212,191,0.95)",
    pillBg: "rgba(45,212,191,0.14)",
    pillBorder: "rgba(45,212,191,0.30)",
    pillText: "rgba(234,255,251,0.96)",
  },
  prezentacja: {
    label: "Prezentacja",
    dot: "rgba(29,78,216,0.95)",
    pillBg: "rgba(29,78,216,0.14)",
    pillBorder: "rgba(29,78,216,0.28)",
    pillText: "rgba(224,232,255,0.96)",
  },
  umowa: {
    label: "Umowa",
    dot: "rgba(245,158,11,0.95)",
    pillBg: "rgba(245,158,11,0.14)",
    pillBorder: "rgba(245,158,11,0.28)",
    pillText: "rgba(255,236,200,0.96)",
  },
  inne: {
    label: "Inne",
    dot: "rgba(148,163,184,0.95)",
    pillBg: "rgba(255,255,255,0.06)",
    pillBorder: "rgba(255,255,255,0.10)",
    pillText: "rgba(234,255,251,0.92)",
  },
};

/* =========================
   HELPERS
========================= */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function monthLabelPL(year: number, mIndex: number) {
  return new Date(year, mIndex, 1).toLocaleString("pl-PL", { month: "long" });
}

function mondayFirstDowIndex(date: Date) {
  const js = date.getDay(); // 0=Sun..6=Sat
  return (js + 6) % 7; // 0=Mon..6=Sun
}

function minutesSinceMidnight(hhmm: string) {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return (h || 0) * 60 + (m || 0);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* =========================
   PAGE
========================= */

const DEFAULT_DURATION = 30;

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()));
  const [anchor, setAnchor] = useState<Date>(() => new Date()); // mini-kalendarz

  // modal add/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const [form, setForm] = useState<Omit<CalendarEvent, "id">>({
    date: toISODate(new Date()),
    time: "09:00",
    title: "",
    note: "",
    type: "pozysk",
    durationMin: DEFAULT_DURATION,
  });

  // quick filter (right panel)
  const [filterType, setFilterType] = useState<EventType | "all">("all");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CalendarEvent[];
        setEvents(Array.isArray(parsed) ? parsed : []);
      } catch {
        setEvents([]);
      }
    }
  }, []);

  const saveAll = (data: CalendarEvent[]) => {
    setEvents(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const todayISO = useMemo(() => toISODate(new Date()), []);

  // keep anchor month aligned to selectedDate
  useEffect(() => {
    const d = parseISODate(selectedDate);
    setAnchor((prev) => {
      const same = prev.getFullYear() === d.getFullYear() && prev.getMonth() === d.getMonth();
      return same ? prev : d;
    });
  }, [selectedDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => minutesSinceMidnight(a.time) - minutesSinceMidnight(b.time));
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const dayEventsAll = useMemo(() => {
    const arr = eventsByDate.get(selectedDate) ?? [];
    return arr.slice().sort((a, b) => minutesSinceMidnight(a.time) - minutesSinceMidnight(b.time));
  }, [eventsByDate, selectedDate]);

  const dayEvents = useMemo(() => {
    const base = dayEventsAll;
    if (filterType === "all") return base;
    return base.filter((e) => e.type === filterType);
  }, [dayEventsAll, filterType]);

  // upcoming list
  const upcoming = useMemo(() => {
    const now = new Date();
    const nowISO = toISODate(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const out: CalendarEvent[] = [];
    for (const e of events) {
      if (e.date < nowISO) continue;
      if (e.date === nowISO && minutesSinceMidnight(e.time) < nowMins) continue;
      out.push(e);
    }
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return minutesSinceMidnight(a.time) - minutesSinceMidnight(b.time);
    });
    return out.slice(0, 8);
  }, [events]);

  // stats
  const stats = useMemo(() => {
    const all = events.length;
    const pozysk = events.filter((e) => e.type === "pozysk").length;
    const prezentacja = events.filter((e) => e.type === "prezentacja").length;
    const umowa = events.filter((e) => e.type === "umowa").length;
    return { all, pozysk, prezentacja, umowa };
  }, [events]);

  // mini calendar month
  const monthYear = anchor.getFullYear();
  const monthIndex = anchor.getMonth();
  const daysInMonth = useMemo(() => new Date(monthYear, monthIndex + 1, 0).getDate(), [monthYear, monthIndex]);
  const firstOffset = useMemo(() => mondayFirstDowIndex(new Date(monthYear, monthIndex, 1)), [monthYear, monthIndex]);

  const prevMonth = () => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setSelectedDate(todayISO);

  const stepDay = (delta: number) => {
    const d = parseISODate(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(toISODate(d));
  };

  // modal helpers
  const openNew = (dateISO: string) => {
    setEditing(null);
    setForm({
      date: dateISO,
      time: "09:00",
      title: "",
      note: "",
      type: "pozysk",
      durationMin: DEFAULT_DURATION,
    });
    setIsModalOpen(true);
  };

  const openEdit = (e: CalendarEvent) => {
    setEditing(e);
    setForm({
      date: e.date,
      time: e.time,
      title: e.title,
      note: e.note,
      type: e.type,
      durationMin: e.durationMin ?? DEFAULT_DURATION,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const saveEvent = () => {
    if (!form.date) return alert("Brakuje daty.");
    if (!form.time || !form.title) return alert("Uzupełnij godzinę i tytuł.");

    const clean: Omit<CalendarEvent, "id"> = {
      ...form,
      durationMin: clamp(Number(form.durationMin ?? DEFAULT_DURATION), 15, 12 * 60),
    };

    if (editing) {
      saveAll(events.map((e) => (e.id === editing.id ? { ...e, ...clean } : e)));
    } else {
      saveAll([...events, { id: Date.now(), ...clean }]);
    }

    closeModal();
  };

  const deleteEvent = (id: number) => {
    if (!confirm("Usunąć wydarzenie?")) return;
    saveAll(events.filter((e) => e.id !== id));
    closeModal();
  };

  const selectedPretty = useMemo(() => {
    const d = parseISODate(selectedDate);
    return d.toLocaleDateString("pl-PL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }, [selectedDate]);

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      <style>{`
        .pill {
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 1000;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: var(--text-main);
        }
        .roundBtn {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: var(--text-main);
          font-weight: 1000;
          cursor: pointer;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .card {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 18px 40px rgba(0,0,0,0.12);
          overflow: hidden;
        }
        .cardHead {
          padding: 12px 12px;
          background: rgba(15,23,42,0.20);
          border-bottom: 1px solid rgba(255,255,255,0.10);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          color: rgba(234,255,251,0.92);
        }
        .muted {
          color: rgba(234,255,251,0.78);
          opacity: 0.9;
          font-size: 12px;
          font-weight: 900;
        }

        .layout {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }

        /* SIDE */
        .sideBody {
          background: rgba(255,255,255,0.92);
          padding: 12px;
          display: grid;
          gap: 12px;
        }

        /* MINI CAL */
        .miniCal {
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(255,255,255,0.96);
          box-shadow: 0 10px 22px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .miniHead {
          padding: 10px 10px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 8px;
          border-bottom: 1px solid rgba(15,23,42,0.08);
          color: rgba(15,23,42,0.84);
        }
        .miniTitle {
          font-weight: 1000;
          text-transform: capitalize;
        }
        .miniDays {
          padding: 10px;
          display:grid;
          gap: 8px;
        }
        .miniWeekdays {
          display:grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .miniWeekday {
          text-align:center;
          font-size: 11px;
          font-weight: 1000;
          color: rgba(15,23,42,0.55);
        }
        .miniGrid {
          display:grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .miniCell {
          border-radius: 12px;
          border: 1px solid rgba(15,23,42,0.08);
          background: rgba(15,23,42,0.02);
          height: 36px;
        }
        .miniBtn {
          border-radius: 12px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(255,255,255,0.98);
          height: 36px;
          cursor: pointer;
          font-weight: 1000;
          color: rgba(15,23,42,0.86);
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 6px;
        }
        .miniBtn:hover { transform: translateY(-1px); }
        .miniBtnActive {
          border: 1px solid rgba(45,212,191,0.55) !important;
          box-shadow: 0 0 0 4px rgba(45,212,191,0.12);
        }
        .miniDot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(29,78,216,0.70);
          display:inline-block;
        }

        /* UPCOMING */
        .upcomingBox {
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(255,255,255,0.96);
          box-shadow: 0 10px 22px rgba(0,0,0,0.06);
          overflow: hidden;
        }
        .upcomingHead {
          padding: 10px 10px;
          border-bottom: 1px solid rgba(15,23,42,0.08);
          display:flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          color: rgba(15,23,42,0.84);
        }
        .upcomingList {
          padding: 10px;
          display: grid;
          gap: 8px;
        }
        .upItem {
          border-radius: 14px;
          padding: 10px 10px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(15,23,42,0.03);
          color: rgba(15,23,42,0.86);
          cursor:pointer;
          text-align:left;
        }
        .upTop {
          display:flex;
          justify-content:space-between;
          gap: 10px;
          font-weight: 1000;
          font-size: 12px;
          opacity: 0.95;
        }
        .upTitle {
          margin-top: 4px;
          font-weight: 1000;
          font-size: 13px;
        }

        /* RIGHT: DAY AGENDA */
        .rightBody {
          background: rgba(255,255,255,0.92);
        }
        .agendaTools {
          padding: 12px;
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(15,23,42,0.10);
          background: rgba(255,255,255,0.96);
        }
        .select {
          border-radius: 999px;
          padding: 10px 12px;
          border: 1px solid rgba(15,23,42,0.12);
          background: rgba(15,23,42,0.03);
          color: rgba(15,23,42,0.85);
          font-weight: 1000;
          outline: none;
          cursor: pointer;
        }
        .agendaList {
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .emptyBox {
          border-radius: 16px;
          border: 1px dashed rgba(15,23,42,0.16);
          background: rgba(15,23,42,0.02);
          padding: 14px;
          color: rgba(15,23,42,0.70);
          font-weight: 900;
          font-size: 13px;
        }
        .eventRow {
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,0.10);
          background: rgba(255,255,255,0.98);
          box-shadow: 0 10px 22px rgba(0,0,0,0.06);
          padding: 12px 12px;
          cursor: pointer;
        }
        .eventTopLine {
          display:flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }
        .leftTop {
          display:flex;
          align-items: baseline;
          gap: 10px;
          min-width: 0;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex: 0 0 auto;
          margin-top: 2px;
        }
        .time {
          font-weight: 1000;
          font-size: 12px;
          color: rgba(15,23,42,0.70);
          flex: 0 0 auto;
        }
        .title {
          font-weight: 1000;
          font-size: 14px;
          color: rgba(15,23,42,0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pillType {
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 1000;
          border: 1px solid;
          white-space: nowrap;
        }
        .note {
          margin-top: 8px;
          font-size: 12px;
          color: rgba(15,23,42,0.72);
          line-height: 1.35;
          white-space: pre-wrap;
        }

        /* MODAL */
        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 14px;
          background: rgba(0,0,0,0.70);
        }
        .modal {
          width: 100%;
          max-width: 720px;
          border-radius: 18px;
          background: rgba(255,255,255,0.98);
          border: 1px solid rgba(15,23,42,0.10);
          padding: 18px;
          max-height: calc(100vh - 24px);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        .label {
          font-size: 12px;
          font-weight: 1000;
          margin-bottom: 6px;
          display:block;
          color: rgba(15,23,42,0.68);
        }
        .input {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(15,23,42,0.12);
          background: rgba(15,23,42,0.03);
          color: #0f172a;
          outline: none;
        }
        .input:focus {
          border-color: rgba(45, 212, 191, 0.55);
          box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.16);
        }
        .btnPrimary {
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 1000;
          border: 1px solid rgba(45, 212, 191, 0.35);
          background: rgba(45, 212, 191, 0.14);
          color: #0f172a;
          cursor: pointer;
        }
        .btnDanger {
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 1000;
          border: 1px solid rgba(239,68,68,0.22);
          background: rgba(239,68,68,0.10);
          color: rgba(185,28,28,0.95);
          cursor: pointer;
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            📅 Kalendarz — Mini miesiąc + Agenda
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Zostawiamy mini-kalendarz i „Następne”. Po prawej: czytelna lista dnia (bez siatki godzin).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Wszystkie" value={stats.all} tone="neutral" />
          <Kpi label="Pozyski" value={stats.pozysk} tone="mint" />
          <Kpi label="Prezentacje" value={stats.prezentacja} tone="blue" />
          <Kpi label="Umowy" value={stats.umowa} tone="amber" />
        </div>
      </div>

      {/* TOP ACTIONS */}
      <div className="mt-7 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="pill" onClick={() => stepDay(-1)} title="Poprzedni dzień">
            ← Dzień
          </button>
          <button className="pill" onClick={goToday}>
            Dziś
          </button>
          <button className="pill" onClick={() => stepDay(1)} title="Następny dzień">
            Dzień →
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className="pill" onClick={() => openNew(selectedDate)}>
            ➕ Dodaj wydarzenie
          </button>
        </div>
      </div>

      {/* LAYOUT */}
      <section className="layout">
        {/* SIDE */}
        <aside className="card">
          <div className="cardHead">
            <div>
              <div style={{ fontWeight: 1000 }}>Nawigacja</div>
              <div className="muted">Mini miesiąc + Nadchodzące</div>
            </div>
            <button className="pill" onClick={goToday} title="Skocz do dziś" style={{ padding: "8px 12px" }}>
              Dziś
            </button>
          </div>

          <div className="sideBody">
            {/* MINI CAL */}
            <div className="miniCal">
              <div className="miniHead">
                <div className="miniTitle">
                  {monthLabelPL(anchor.getFullYear(), anchor.getMonth())} {anchor.getFullYear()}
                </div>
                <div className="flex gap-2">
                  <button className="roundBtn" onClick={prevMonth} title="Poprzedni miesiąc">
                    ←
                  </button>
                  <button className="roundBtn" onClick={nextMonth} title="Następny miesiąc">
                    →
                  </button>
                </div>
              </div>

              <div className="miniDays">
                <div className="miniWeekdays">
                  {WEEKDAYS_PL.map((w, i) => (
                    <div
                      key={w}
                      className="miniWeekday"
                      style={i >= 5 ? { color: "rgba(245,158,11,0.85)" } : undefined}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                <div className="miniGrid">
                  {Array.from({ length: firstOffset }).map((_, idx) => (
                    <div key={`mblank-${idx}`} className="miniCell" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const iso = `${anchor.getFullYear()}-${pad2(anchor.getMonth() + 1)}-${pad2(day)}`;
                    const isActive = iso === selectedDate;
                    const count = (eventsByDate.get(iso) ?? []).length;

                    return (
                      <button
                        key={iso}
                        className={`miniBtn ${isActive ? "miniBtnActive" : ""}`}
                        onClick={() => setSelectedDate(iso)}
                        title={iso}
                      >
                        <span>{day}</span>
                        {count ? <span className="miniDot" title={`${count} wydarzeń`} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* UPCOMING */}
            <div className="upcomingBox">
              <div className="upcomingHead">
                <div style={{ fontWeight: 1000 }}>Następne</div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>{upcoming.length ? `${upcoming.length}` : "—"}</div>
              </div>

              <div className="upcomingList">
                {upcoming.length === 0 ? (
                  <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.65)" }}>
                    Brak nadchodzących wydarzeń.
                  </div>
                ) : (
                  upcoming.map((e) => {
                    const meta = TYPE_META[e.type];
                    const datePretty = parseISODate(e.date).toLocaleDateString("pl-PL", { month: "short", day: "2-digit" });

                    return (
                      <button
                        key={e.id}
                        className="upItem"
                        onClick={() => {
                          setSelectedDate(e.date);
                          openEdit(e);
                        }}
                        title={`${e.date} ${e.time}`}
                      >
                        <div className="upTop">
                          <span>
                            {datePretty} • {e.time}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.dot }} />
                            {meta.label}
                          </span>
                        </div>
                        <div className="upTitle">{e.title}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT: AGENDA */}
        <section className="card">
          <div className="cardHead">
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 1000 }}>{selectedPretty}</div>
              <div className="muted">
                {dayEventsAll.length ? `${dayEventsAll.length} wydarzeń w dniu` : "Brak wydarzeń w tym dniu"}
                {filterType !== "all" ? ` • filtr: ${TYPE_META[filterType].label}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button className="pill" onClick={() => openNew(selectedDate)} style={{ padding: "8px 12px" }}>
                ➕ Dodaj
              </button>
              <button className="roundBtn" onClick={() => stepDay(-1)} title="Poprzedni dzień">
                ←
              </button>
              <button className="roundBtn" onClick={() => stepDay(1)} title="Następny dzień">
                →
              </button>
            </div>
          </div>

          <div className="rightBody">
            <div className="agendaTools">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 12, fontWeight: 1000, color: "rgba(15,23,42,0.65)" }}>Filtr typu</label>
                <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
                  <option value="all">Wszystkie</option>
                  <option value="pozysk">Pozysk</option>
                  <option value="prezentacja">Prezentacja</option>
                  <option value="umowa">Umowa</option>
                  <option value="inne">Inne</option>
                </select>
              </div>

              <button className="pill" onClick={() => openNew(selectedDate)} style={{ background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.10)", color: "rgba(15,23,42,0.86)" }}>
                Szybko dodaj
              </button>
            </div>

            <div className="agendaList">
              {dayEvents.length === 0 ? (
                <div className="emptyBox">
                  {filterType === "all"
                    ? "Brak wydarzeń w tym dniu. Kliknij „Dodaj” aby utworzyć nowe."
                    : "Brak wydarzeń dla tego filtra. Zmień filtr na „Wszystkie” albo dodaj nowe."}
                </div>
              ) : (
                dayEvents.map((e) => {
                  const meta = TYPE_META[e.type];
                  const dur = e.durationMin ?? DEFAULT_DURATION;

                  return (
                    <div key={e.id} className="eventRow" onClick={() => openEdit(e)} title="Kliknij, aby edytować">
                      <div className="eventTopLine">
                        <div className="leftTop">
                          <span className="dot" style={{ background: meta.dot }} />
                          <span className="time">
                            {e.time} • {dur}m
                          </span>
                          <span className="title">{e.title}</span>
                        </div>

                        <span
                          className="pillType"
                          style={{
                            borderColor: meta.pillBorder,
                            background: meta.pillBg,
                            color: meta.pillText,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>

                      {e.note ? <div className="note">{e.note}</div> : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </section>

      {/* MODAL */}
      {isModalOpen ? (
        <div className="modalBackdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
                  {editing ? "Edytuj" : "Dodaj"} — {form.date}
                </div>
                <div className="mt-1 text-xl font-black" style={{ color: "#0f172a" }}>
                  {editing ? "Wydarzenie" : "Nowe wydarzenie"}
                </div>
              </div>

              <button
                className="pill"
                onClick={closeModal}
                style={{
                  background: "rgba(15,23,42,0.06)",
                  border: "1px solid rgba(15,23,42,0.12)",
                  color: "rgba(15,23,42,0.78)",
                }}
              >
                ✕ Zamknij
              </button>
            </div>

            {editing ? (
              <div
                className="mt-4 rounded-2xl p-4"
                style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.10)" }}
              >
                <div style={{ fontWeight: 1000, color: "rgba(15,23,42,0.80)" }}>Akcje</div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button className="btnDanger" onClick={() => deleteEvent(editing.id)}>
                    🗑 Usuń
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label">Data</label>
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>

              <div>
                <label className="label">Godzina</label>
                <input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>

              <div>
                <label className="label">Długość (min)</label>
                <input
                  className="input"
                  type="number"
                  min={15}
                  step={15}
                  value={Number(form.durationMin ?? DEFAULT_DURATION)}
                  onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="label">Typ</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>
                  <option value="pozysk">Pozysk</option>
                  <option value="prezentacja">Prezentacja</option>
                  <option value="umowa">Umowa</option>
                  <option value="inne">Inne</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="label">Tytuł</label>
                <input className="input" placeholder="np. Prezentacja mieszkania" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <label className="label">Notatka</label>
                <textarea
                  className="input"
                  style={{ height: 120, resize: "vertical" }}
                  placeholder="Adres, klient, szczegóły…"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2 flex-wrap">
              <button className="btnPrimary" onClick={saveEvent} style={{ flex: 1, minWidth: 220 }}>
                {editing ? "✅ Zapisz zmiany" : "➕ Dodaj wydarzenie"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

/* =========================
   KPI
========================= */

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
