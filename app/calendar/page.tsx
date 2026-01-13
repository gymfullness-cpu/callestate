?"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type EventType = "pozysk" | "prezentacja" | "umowa" | "inne";

type CalendarEvent = {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  title: string;
  note: string;
  type: EventType;
};

const STORAGE_KEY = "calendar-events";
const ZOOM_KEY = "calendar-zoom";

// & szerszy zakres zoom
const ZOOM_MIN = 30;
const ZOOM_MAX = 160;

const WEEKDAYS_PL = ["Pon", "Wt", "9ar", "Czw", "Pt", "Sob", "Ndz"];

const TYPE_META: Record<EventType, { label: string; bg: string; border: string; text: string }> = {
  pozysk: {
    label: "Pozysk",
    bg: "rgba(45,212,191,0.18)",
    border: "rgba(45,212,191,0.45)",
    text: "#0f172a",
  },
  prezentacja: {
    label: "Prezentacja",
    bg: "rgba(29,78,216,0.14)",
    border: "rgba(29,78,216,0.34)",
    text: "#0f172a",
  },
  umowa: {
    label: "Umowa",
    bg: "rgba(245,158,11,0.14)",
    border: "rgba(245,158,11,0.34)",
    text: "#0f172a",
  },
  inne: {
    label: "Inne",
    bg: "rgba(15,23,42,0.07)",
    border: "rgba(15,23,42,0.16)",
    text: "rgba(15,23,42,0.82)",
  },
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function monthLabelPL(year: number, mIndex: number) {
  return new Date(year, mIndex).toLocaleString("pl", { month: "long" });
}

// Monday-first day index: 0=Mon ... 6=Sun
function mondayFirstDowIndex(date: Date) {
  const js = date.getDay(); // 0=Sun..6=Sat
  return (js + 6) % 7;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<"month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const [form, setForm] = useState<Omit<CalendarEvent, "id">>({
    date: "",
    time: "",
    title: "",
    note: "",
    type: "pozysk",
  });

  const [zoom, setZoom] = useState<number>(100);

  // auto-scroll to today in month view (desktop grid)
  const todayCellRef = useRef<HTMLButtonElement | null>(null);
  const didAutoScrollRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setEvents(JSON.parse(saved));

    const z = localStorage.getItem(ZOOM_KEY);
    if (z) {
      const parsed = Number(z);
      if (!Number.isNaN(parsed)) setZoom(clamp(parsed, ZOOM_MIN, ZOOM_MAX));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ZOOM_KEY, String(zoom));
  }, [zoom]);

  // Ctrl/� + scroll = zoom (bez |adnych napis�w w UI)
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const withMod = e.ctrlKey || e.metaKey;
      if (!withMod) return;

      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const step = 5;
      setZoom((z) => clamp(z + dir * step, ZOOM_MIN, ZOOM_MAX));
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel as any);
  }, []);

  const saveAll = (data: CalendarEvent[]) => {
    setEvents(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDateStr = `${year}-${pad2(month + 1)}-${pad2(today.getDate())}`;

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayOffset = useMemo(() => mondayFirstDowIndex(new Date(year, month, 1)), [year, month]);

  const byDate = (date: string) => events.filter((e) => e.date === date);

  const openDay = (date: string) => {
    setSelectedDate(date);
    setEditing(null);
    setForm({ date, time: "", title: "", note: "", type: "pozysk" });
  };

  const saveEvent = () => {
    if (!form.time || !form.title) return alert("UzupeBnij godzin" i tytuB.");

    if (editing) {
      saveAll(events.map((e) => (e.id === editing.id ? { ...editing, ...form } : e)));
    } else {
      saveAll([...events, { ...form, id: Date.now() }]);
    }

    setEditing(null);
    setForm({ ...form, time: "", title: "", note: "" });
  };

  const editEvent = (e: CalendarEvent) => {
    setEditing(e);
    setForm({ ...e });
  };

  const deleteEvent = (id: number) => {
    if (!confirm("Usun&! wydarzenie?")) return;
    saveAll(events.filter((e) => e.id !== id));
  };

  const stats = useMemo(() => {
    const all = events.length;
    const pozysk = events.filter((e) => e.type === "pozysk").length;
    const prezentacja = events.filter((e) => e.type === "prezentacja").length;
    const umowa = events.filter((e) => e.type === "umowa").length;
    return { all, pozysk, prezentacja, umowa };
  }, [events]);

  // zoom scale
  const zoomScale = zoom / 100;

  // month layout based on zoom (desktop grid)
  const monthCellMinH = Math.max(90, Math.round(160 * zoomScale));
  const monthCellPad = Math.max(10, Math.round(14 * zoomScale));
  const dayNumberSize = Math.max(12, Math.round(18 * zoomScale));
  const weekdayHeaderSize = Math.max(10, Math.round(12 * zoomScale));

  // year layout based on zoom
  const yearDayPadY = Math.max(5, Math.round(8 * zoomScale));
  const yearDayRadius = Math.max(9, Math.round(12 * zoomScale));

  // & auto-scroll to today (only once)  desktop grid
  useEffect(() => {
    if (view !== "month") return;
    if (didAutoScrollRef.current) return;

    const t = window.setTimeout(() => {
      if (!todayCellRef.current) return;
      todayCellRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      didAutoScrollRef.current = true;
    }, 120);

    return () => window.clearTimeout(t);
  }, [view]);

  // & jasne kafelki + weekend te| jasny, tylko cieplejszy
  const DAY_BG = "rgba(255,255,255,0.96)";
  const DAY_BORDER = "rgba(15,23,42,0.10)";

  const WEEKEND_BG = "rgba(255,255,255,0.96)";
  const WEEKEND_BORDER = "rgba(245,158,11,0.22)";
  const WEEKEND_TOP_GLOW = "inset 0 1px 0 rgba(245,158,11,0.20)";

  // & Mobile list data (pionowo)
  const monthDays = useMemo(() => {
    const out: Array<{
      date: string;
      day: number;
      weekdayIdx: number; // 0..6 Mon..Sun
      isWeekend: boolean;
      isToday: boolean;
      items: CalendarEvent[];
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${pad2(month + 1)}-${pad2(d)}`;
      const weekdayIdx = (firstDayOffset + (d - 1)) % 7;
      const isWeekend = weekdayIdx === 5 || weekdayIdx === 6;
      const isToday = date === todayDateStr;
      const items = byDate(date).slice().sort((a, b) => a.time.localeCompare(b.time));
      out.push({ date, day: d, weekdayIdx, isWeekend, isToday, items });
    }

    return out;
  }, [daysInMonth, firstDayOffset, month, year, events, todayDateStr]);

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      {/* Mobile-only styling for �[chmurki�e */}
      <style>{`
        .ce-daycard {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          padding: 14px;
        }
        .ce-daycard--weekend {
          border: 1px solid rgba(245,158,11,0.22);
          background: rgba(245,158,11,0.08);
        }
        .ce-daycard--today {
          border-color: rgba(45,212,191,0.45) !important;
          box-shadow: 0 0 0 4px rgba(45,212,191,0.14);
        }
        .ce-dayhead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }
        .ce-daytitle {
          display: flex;
          align-items: baseline;
          gap: 10px;
          min-width: 0;
        }
        .ce-weekday {
          font-weight: 900;
          font-size: 12px;
          color: rgba(234,255,251,0.92);
          opacity: 0.95;
          white-space: nowrap;
        }
        .ce-daynum {
          font-weight: 1000;
          font-size: 18px;
          color: rgba(234,255,251,0.98);
          letter-spacing: -0.2px;
        }
        .ce-badge {
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(15,23,42,0.20);
          color: rgba(234,255,251,0.92);
          white-space: nowrap;
        }
        .ce-badge--has {
          border: 1px solid rgba(45,212,191,0.35);
          background: rgba(45,212,191,0.16);
        }
        .ce-events {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }
        .ce-mini {
          border-radius: 14px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,0.12);
        }
        .ce-mini__top {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.92;
          color: rgba(234,255,251,0.82);
        }
        .ce-mini__title {
          margin-top: 2px;
          font-size: 13px;
          font-weight: 1000;
          color: rgba(234,255,251,0.95);
        }
        .ce-more {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.9;
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            & Kalendarz
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}></p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Wszystkie" value={stats.all} tone="neutral" />
          <Kpi label="Pozyski" value={stats.pozysk} tone="mint" />
          <Kpi label="Prezentacje" value={stats.prezentacja} tone="blue" />
          <Kpi label="Umowy" value={stats.umowa} tone="amber" />
        </div>
      </div>

      {/* TOP BAR */}
      <div className="mt-7 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setView("month")}
            aria-pressed={view === "month"}
            style={view === "month" ? pillActive : pillIdle}
          >
            Miesi&c
          </button>
          <button
            onClick={() => setView("year")}
            aria-pressed={view === "year"}
            style={view === "year" ? pillActive : pillIdle}
          >
            Rok
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => clamp(z - 5, ZOOM_MIN, ZOOM_MAX))} title="Oddal" style={roundBtnStyle}>
            �
          </button>
          <button onClick={() => setZoom((z) => clamp(z + 5, ZOOM_MIN, ZOOM_MAX))} title="Przybli|" style={roundBtnStyle}>
            +
          </button>
          <button onClick={() => setZoom(100)} style={pillIdle} title="Reset zoom do 100%">
            Reset
          </button>

          <div className="text-sm font-extrabold" style={{ color: "var(--text-muted)" }}>
            {view === "month" ? (
              <>
                {monthLabelPL(year, month)} {year}
              </>
            ) : (
              <>Rok {year}</>
            )}
          </div>
        </div>
      </div>

      {/* MONTH */}
      {view === "month" ? (
        <section className="mt-5">
          {/* & MOBILE ONLY (pionowo) */}
          <div className="md:hidden grid gap-3">
            {monthDays.map((d) => {
              const has = d.items.length > 0;
              return (
                <button
                  key={d.date}
                  onClick={() => openDay(d.date)}
                  className={[
                    "ce-daycard",
                    d.isWeekend ? "ce-daycard--weekend" : "",
                    d.isToday ? "ce-daycard--today" : "",
                  ].join(" ")}
                  style={{ cursor: "pointer", textAlign: "left", outline: "none" }}
                  title={d.date}
                >
                  <div className="ce-dayhead">
                    <div className="ce-daytitle">
                      <div className="ce-weekday">{WEEKDAYS_PL[d.weekdayIdx]}</div>
                      <div className="ce-daynum">{d.day}</div>
                    </div>
                    <span className={`ce-badge ${has ? "ce-badge--has" : ""}`}>
                      {has ? `${d.items.length} spotk.` : "brak"}
                    </span>
                  </div>

                  {has ? (
                    <div className="ce-events">
                      {d.items.slice(0, 2).map((e) => {
                        const meta = TYPE_META[e.type];
                        return (
                          <div
                            key={e.id}
                            className="ce-mini"
                            style={{
                              background: meta.bg,
                              borderColor: meta.border,
                              color: "rgba(234,255,251,0.95)", // & jasny tekst na mobile
                            }}
                          >
                            <div className="ce-mini__top">
                              {e.time} �� {meta.label}
                            </div>
                            <div className="ce-mini__title">{e.title}</div>
                          </div>
                        );
                      })}
                      {d.items.length > 2 ? (
                        <div className="ce-more" style={{ color: "rgba(234,255,251,0.85)" }}>
                          +{d.items.length - 2} wi"cej��
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* & DESKTOP ONLY (siatka) */}
          <div className="hidden md:block">
            {/* weekday header */}
            <div className="grid grid-cols-7 gap-4 mb-4">
              {WEEKDAYS_PL.map((w, idx) => {
                const isWeekend = idx === 5 || idx === 6;
                return (
                  <div
                    key={w}
                    className="rounded-2xl px-3 py-2 text-center font-extrabold"
                    style={{
                      background: isWeekend ? "rgba(245,158,11,0.10)" : "rgba(255,255,255,0.05)",
                      border: isWeekend ? "1px solid rgba(245,158,11,0.22)" : "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(234,255,251,0.92)",
                      fontSize: weekdayHeaderSize,
                    }}
                  >
                    {w}
                  </div>
                );
              })}
            </div>

            {/* days grid */}
            <div className="grid grid-cols-7 gap-4">
              {/* leading blanks */}
              {Array.from({ length: firstDayOffset }).map((_, idx) => (
                <div
                  key={`blank-${idx}`}
                  className="rounded-2xl"
                  style={{
                    minHeight: monthCellMinH,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px dashed rgba(255,255,255,0.08)",
                  }}
                />
              ))}

              {/* actual days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = `${year}-${pad2(month + 1)}-${pad2(day)}`;
                const dayEvents = byDate(date);
                const isToday = date === todayDateStr;

                const colIndex = (firstDayOffset + i) % 7; // 0..6 Mon..Sun
                const isWeekend = colIndex === 5 || colIndex === 6;

                return (
                  <button
                    key={date}
                    ref={isToday ? todayCellRef : null}
                    onClick={() => openDay(date)}
                    className="text-left"
                    style={{
                      minHeight: monthCellMinH,
                      padding: monthCellPad,
                      borderRadius: 18,
                      outline: "none",
                      cursor: "pointer",

                      background: isWeekend ? WEEKEND_BG : DAY_BG,
                      border: `1px solid ${isWeekend ? WEEKEND_BORDER : DAY_BORDER}`,
                      boxShadow: isWeekend ? WEEKEND_TOP_GLOW : "none",

                      ...(isToday
                        ? {
                            border: "1px solid rgba(45,212,191,0.55)",
                            boxShadow: "0 0 0 4px rgba(45,212,191,0.12)",
                          }
                        : {}),
                    }}
                    title={date}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          className="font-black"
                          style={{
                            color: "#0f172a",
                            fontSize: dayNumberSize,
                            lineHeight: 1,
                          }}
                        >
                          {day}
                        </div>

                        {isToday ? (
                          <span
                            style={{
                              width: Math.max(7, Math.round(10 * zoomScale)),
                              height: Math.max(7, Math.round(10 * zoomScale)),
                              borderRadius: 999,
                              background: "rgba(45,212,191,0.85)",
                              boxShadow: "0 8px 18px rgba(45,212,191,0.30)",
                              display: "inline-block",
                            }}
                            title="Dzisiaj"
                          />
                        ) : null}
                      </div>

                      {dayEvents.length > 0 ? (
                        <span
                          className="rounded-full px-3 py-1 font-extrabold"
                          style={{
                            background: "rgba(15,23,42,0.06)",
                            border: "1px solid rgba(15,23,42,0.12)",
                            color: "rgba(15,23,42,0.70)",
                            fontSize: Math.max(10, Math.round(12 * zoomScale)),
                          }}
                        >
                          {dayEvents.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {dayEvents.slice(0, 3).map((e) => (
                        <EventChip key={e.id} e={e} zoom={zoomScale} />
                      ))}

                      {dayEvents.length > 3 ? (
                        <div
                          className="font-bold"
                          style={{
                            color: "rgba(15,23,42,0.55)",
                            fontSize: Math.max(10, Math.round(12 * zoomScale)),
                          }}
                        >
                          +{dayEvents.length - 3} wi"cej��
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* YEAR */}
      {view === "year" ? (
        <section className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(12)].map((_, m) => {
            const days = new Date(year, m + 1, 0).getDate();
            const label = monthLabelPL(year, m);

            const offset = mondayFirstDowIndex(new Date(year, m, 1));

            return (
              <div
                key={m}
                style={{
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.96)",
                  border: "1px solid rgba(15,23,42,0.10)",
                  padding: 18,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
                      Miesi&c
                    </div>
                    <div className="mt-1 font-black" style={{ color: "#0f172a", textTransform: "capitalize" }}>
                      {label}
                    </div>
                  </div>
                  <div className="text-xs font-extrabold" style={{ color: "rgba(15,23,42,0.60)" }}>
                    {year}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-2">
                  {WEEKDAYS_PL.map((w, idx) => (
                    <div
                      key={`${m}-${w}`}
                      className="text-center font-extrabold"
                      style={{
                        fontSize: Math.max(9, Math.round(10 * zoomScale)),
                        color: idx >= 5 ? "rgba(245,158,11,0.85)" : "rgba(15,23,42,0.55)",
                      }}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                  {Array.from({ length: offset }).map((_, idx) => (
                    <div
                      key={`yblank-${m}-${idx}`}
                      style={{
                        height: 30,
                        borderRadius: yearDayRadius,
                        background: "rgba(15,23,42,0.02)",
                        border: "1px dashed rgba(15,23,42,0.08)",
                      }}
                    />
                  ))}

                  {Array.from({ length: days }).map((_, d) => {
                    const date = `${year}-${pad2(m + 1)}-${pad2(d + 1)}`;
                    const has = byDate(date).length > 0;
                    const isToday = date === todayDateStr;

                    const colIndex = (offset + d) % 7;
                    const isWeekend = colIndex === 5 || colIndex === 6;

                    return (
                      <button
                        key={date}
                        onClick={() => openDay(date)}
                        style={{
                          padding: `${yearDayPadY}px 0`,
                          borderRadius: yearDayRadius,
                          background: isWeekend ? "rgba(245,158,11,0.06)" : "rgba(15,23,42,0.04)",
                          border: isWeekend ? "1px solid rgba(245,158,11,0.18)" : "1px solid rgba(15,23,42,0.10)",
                          color: "rgba(15,23,42,0.86)",
                          fontSize: Math.max(10, Math.round(12 * zoomScale)),
                          fontWeight: 900,
                          cursor: "pointer",
                          ...(has ? { background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.25)" } : {}),
                          ...(isToday ? { background: "rgba(45,212,191,0.16)", border: "1px solid rgba(45,212,191,0.45)" } : {}),
                        }}
                        title={date}
                      >
                        {d + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* MODAL */}
      {selectedDate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.70)" }}
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="ce-modal"
            style={{
              width: "100%",
              maxWidth: 720,
              borderRadius: 18,
              background: "rgba(255,255,255,0.98)",
              border: "1px solid rgba(15,23,42,0.10)",
              padding: 22,
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
                  DzieD
                </div>
                <h2 className="mt-1 text-xl font-black" style={{ color: "#0f172a" }}>
                  Z {selectedDate}
                </h2>
              </div>

              <button
                className="rounded-xl px-3 py-2 text-xs font-extrabold"
                style={{
                  background: "rgba(15,23,42,0.06)",
                  border: "1px solid rgba(15,23,42,0.12)",
                  color: "rgba(15,23,42,0.78)",
                }}
                onClick={() => setSelectedDate(null)}
              >
                " Zamknij
              </button>
            </div>

            {byDate(selectedDate).length > 0 ? (
              <>
                <div className="mt-5 text-sm font-extrabold" style={{ color: "rgba(15,23,42,0.75)" }}>
                  Zaplanowane spotkania
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  {byDate(selectedDate).map((e) => (
                    <div
                      key={e.id}
                      className="rounded-2xl p-4"
                      style={{
                        background: "rgba(15,23,42,0.04)",
                        border: "1px solid rgba(15,23,42,0.10)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black" style={{ color: "#0f172a" }}>
                            {e.time}  {e.title}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: "rgba(15,23,42,0.65)" }}>
                            {TYPE_META[e.type].label}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            className="rounded-xl px-3 py-2 text-xs font-extrabold"
                            style={{
                              background: "rgba(15,23,42,0.06)",
                              border: "1px solid rgba(15,23,42,0.12)",
                              color: "rgba(15,23,42,0.80)",
                            }}
                            onClick={() => editEvent(e)}
                          >
                            <��<�
                          </button>
                          <button
                            className="rounded-xl px-3 py-2 text-xs font-extrabold"
                            style={{
                              background: "rgba(239,68,68,0.10)",
                              border: "1px solid rgba(239,68,68,0.22)",
                              color: "rgba(185,28,28,0.95)",
                            }}
                            onClick={() => deleteEvent(e.id)}
                          >
                            =�
                          </button>
                        </div>
                      </div>

                      {e.note ? (
                        <div className="mt-3 text-sm" style={{ color: "rgba(15,23,42,0.78)" }}>
                          {e.note}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <div className="my-6 h-px w-full" style={{ background: "rgba(15,23,42,0.10)" }} />

            <div className="text-sm font-extrabold" style={{ color: "rgba(15,23,42,0.75)" }}>
              {editing ? "Edytuj spotkanie" : "Dodaj nowe spotkanie"}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label-light">" Godzina</label>
                <input
                  className="input-light"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>

              <div>
                <label className="label-light">{ Typ</label>
                <select
                  className="input-light"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
                >
                  <option value="pozysk">Pozysk</option>
                  <option value="prezentacja">Prezentacja</option>
                  <option value="umowa">Umowa</option>
                  <option value="inne">Inne</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="label-light"><��<� TytuB</label>
                <input
                  className="input-light"
                  placeholder="np. Prezentacja mieszkania"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-light">e Notatka</label>
                <textarea
                  className="input-light h-28 resize-y"
                  placeholder="Adres, klient, szczeg�By..."
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>

            <button className="btn-mint mt-5 w-full" onClick={saveEvent}>
              {editing ? "> Zapisz zmiany" : "~" Dodaj spotkanie"}
            </button>

            <style jsx>{`
              .label-light {
                font-size: 12px;
                font-weight: 900;
                margin-bottom: 6px;
                display: block;
                color: rgba(15, 23, 42, 0.68);
                letter-spacing: 0.2px;
              }
              .input-light {
                width: 100%;
                padding: 12px 12px;
                border-radius: 14px;
                border: 1px solid rgba(15, 23, 42, 0.12);
                background: rgba(15, 23, 42, 0.03);
                color: #0f172a;
                outline: none;
              }
              .input-light:focus {
                border-color: rgba(45, 212, 191, 0.55);
                box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.16);
              }
              .btn-mint {
                border-radius: 14px;
                padding: 12px 14px;
                font-weight: 900;
                border: 1px solid rgba(45, 212, 191, 0.35);
                background: rgba(45, 212, 191, 0.14);
                color: #0f172a;
                cursor: pointer;
              }
              .btn-mint:hover {
                transform: translateY(-1px);
                box-shadow: 0 14px 36px rgba(45, 212, 191, 0.18);
              }
              @media (max-width: 720px) {
                .ce-modal {
                  padding: 14px !important;
                  border-radius: 16px !important;
                  max-width: 560px !important;
                }
              }
            `}</style>
          </div>
        </div>
      ) : null}
    </main>
  );
}

/* ====== small UI pieces ====== */

function EventChip({ e, zoom }: { e: CalendarEvent; zoom: number }) {
  const meta = TYPE_META[e.type];

  const timeSize = Math.max(9, Math.round(12 * zoom));
  const titleSize = Math.max(10, Math.round(14 * zoom));

  return (
    <div
      className="rounded-xl"
      style={{
        padding: `${Math.max(7, Math.round(10 * zoom))}px ${Math.max(9, Math.round(12 * zoom))}px`,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.text,
        boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
      }}
    >
      <div className="font-extrabold" style={{ opacity: 0.88, fontSize: timeSize }}>
        {e.time} �� {meta.label}
      </div>
      <div className="font-black" style={{ fontSize: titleSize }}>
        {e.title}
      </div>
    </div>
  );
}

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

const roundBtnStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-main)",
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
