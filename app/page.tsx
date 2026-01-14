"use client";

import { useEffect, useState } from "react";
import NavLink from "./NavLink";

type CalendarEvent = {
  id: number;
  date: string;
  time: string;
  title: string;
};

const MODULES = [
  {
    href: "/calendar",
    icon: "📅",
    title: "Kalendarz",
    desc: "Plan dnia i spotkania",
  },
  {
    href: "/leads",
    icon: "📥",
    title: "Leady",
    desc: "Popyt i historia kontaktu",
  },
  {
    href: "/properties",
    icon: "🏠",
    title: "Nieruchomości",
    desc: "Oferty i ceny",
  },
  {
    href: "/prospects",
    icon: "🎯",
    title: "Pozyski",
    desc: "Pipeline właścicieli",
  },
  {
    href: "/dashboard",
    icon: "📊",
    title: "Dashboard",
    desc: "KPI i skróty",
  },
  {
    href: "/assistant/live",
    icon: "🤖",
    title: "AI Coach",
    desc: "Wsparcie rozmów",
  },
];

export default function HomePage() {
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);

  // localStorage tylko po mount (brak błędu SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("calendar-events");
      if (!raw) return;

      const today = new Date().toISOString().slice(0, 10);
      const parsed = (JSON.parse(raw) as CalendarEvent[]).filter(
        (e) => e.date === today
      );
      setTodayEvents(parsed.slice(0, 3));
    } catch {
      setTodayEvents([]);
    }
  }, []);

  return (
    <div className="ce-wrap">
      {/* HERO */}
      <section className="ce-hero">
        <div className="ce-badge">CALYX AI</div>

        <h1 className="ce-title">
          Premium AI CRM
          <br />
          dla nieruchomości
        </h1>

        <p className="ce-sub">
          Kalendarz, leady, oferty i AI Coach w jednym ekosystemie
          zaprojektowanym dla agentów premium.
        </p>

        <div className="ce-actions">
          <NavLink href="/calendar">📅 Otwórz kalendarz</NavLink>
          <NavLink href="/assistant/live">🤖 AI Coach</NavLink>
        </div>
      </section>

      {/* TODAY */}
      <section className="ce-today">
        <div className="ce-today-title">Dzisiaj</div>

        {todayEvents.length === 0 ? (
          <div className="ce-today-empty">Brak zaplanowanych spotkań</div>
        ) : (
          <div className="ce-today-list">
            {todayEvents.map((e) => (
              <div key={e.id} className="ce-today-item">
                <span>{e.time}</span>
                <strong>{e.title}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODULE GRID */}
      <section className="ce-grid">
        {MODULES.map((m) => (
          <a key={m.href} href={m.href} className="ce-card">
            <div className="ce-card-icon">{m.icon}</div>
            <div className="ce-card-title">{m.title}</div>
            <div className="ce-card-desc">{m.desc}</div>
            <div className="ce-card-cta">Otwórz →</div>
          </a>
        ))}
      </section>

      {/* STYLES */}
      <style>{`
        .ce-wrap {
          display: grid;
          gap: 18px;
        }

        /* HERO */
        .ce-hero {
          padding: 30px;
          border-radius: 26px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(14px);
        }

        .ce-badge {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.9;
        }

        .ce-title {
          margin-top: 10px;
          font-size: 38px;
          font-weight: 1000;
          line-height: 1.05;
        }

        .ce-sub {
          margin-top: 12px;
          max-width: 620px;
          font-size: 15px;
          color: var(--text-muted);
        }

        .ce-actions {
          margin-top: 18px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* TODAY */
        .ce-today {
          padding: 18px;
          border-radius: 20px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-soft);
        }

        .ce-today-title {
          font-weight: 900;
          margin-bottom: 10px;
        }

        .ce-today-item {
          display: flex;
          gap: 10px;
          font-size: 14px;
        }

        .ce-today-empty {
          font-size: 14px;
          color: var(--text-muted);
        }

        /* GRID */
        .ce-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }

        @media (min-width: 900px) {
          .ce-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .ce-card {
          height: 168px;
          border-radius: 20px;
          padding: 18px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          text-decoration: none;
          color: inherit;
        }

        @media (hover: hover) {
          .ce-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 30px 60px rgba(0,0,0,0.35);
          }
        }

        .ce-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.08);
        }

        .ce-card-title {
          font-weight: 950;
        }

        .ce-card-desc {
          font-size: 13px;
          color: var(--text-muted);
        }

        .ce-card-cta {
          font-size: 12px;
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}
